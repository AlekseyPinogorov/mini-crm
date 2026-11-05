import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import {
  createObject,
  createTask,
  createTaskInStatus,
  readStatus,
  service,
  setupUsers,
  type Users,
} from "./helpers";

describe("tasks", () => {
  let users: Users;
  let objectId: string;

  const newTask = () => createTask(users.manager, objectId, users.executorA.id);

  beforeAll(async () => {
    users = await setupUsers();
    objectId = (await createObject(users.manager)).id;
  });

  describe("update status", () => {
    it("should reject with 42501 and keep status when manager updates status directly", async () => {
      const task = await newTask();

      const { error } = await users.manager.client
        .from("tasks")
        .update({ status: "accepted" })
        .eq("id", task.id)
        .select();

      expect(error?.code).toBe("42501");
      expect(await readStatus(task.id)).toBe("new");
    });

    it("should reject with 42501 and keep status when assigned executor updates status directly", async () => {
      const task = await newTask();

      const { error } = await users.executorA.client
        .from("tasks")
        .update({ status: "review" })
        .eq("id", task.id)
        .select();

      expect(error?.code).toBe("42501");
      expect(await readStatus(task.id)).toBe("new");
    });
  });

  describe("insert", () => {
    const base = () => ({
      object_id: objectId,
      title: `task-${randomUUID()}`,
      description: "",
      assignee_id: users.executorA.id,
    });

    it.each<[string, () => Record<string, unknown>]>([
      ["status", () => ({ status: "accepted" })],
      ["author_id", () => ({ author_id: users.manager2.id })],
      ["created_at", () => ({ created_at: "2000-01-01T00:00:00Z" })],
    ])(
      "should reject with 42501 and create nothing when manager sends %s",
      async (_name, extra) => {
        const row = { ...base(), ...extra() };

        const { error } = await users.manager.client
          .from("tasks")
          .insert(row)
          .select();

        expect(error?.code).toBe("42501");
        const { data } = await service
          .from("tasks")
          .select("id")
          .eq("title", row.title);
        expect(data).toEqual([]);
      },
    );

    it("should create task with status new and caller as author when client sends neither", async () => {
      const { data, error } = await users.manager.client
        .from("tasks")
        .insert(base())
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.status).toBe("new");
      expect(data.author_id).toBe(users.manager.id);
    });

    it("should reject and create nothing when executor inserts a task", async () => {
      const row = base();

      const { error } = await users.executorA.client
        .from("tasks")
        .insert(row)
        .select();

      expect(error?.code).toBe("42501");
      const { data } = await service
        .from("tasks")
        .select("id")
        .eq("title", row.title);
      expect(data).toEqual([]);
    });

    it("should reject with 23514 and create nothing when manager sends a whitespace-only title", async () => {
      const row = { ...base(), title: "\n\t" };

      const { error } = await users.manager.client
        .from("tasks")
        .insert(row)
        .select();

      expect(error?.code).toBe("23514");
      const { data } = await service
        .from("tasks")
        .select("id")
        .eq("title", "\n\t");
      expect(data).toEqual([]);
    });

    it("should reject with assignee_must_be_executor and create nothing when manager assigns a manager", async () => {
      const row = { ...base(), assignee_id: users.manager2.id };

      const { error } = await users.manager.client.from("tasks").insert(row);

      expect(error?.message).toContain("assignee_must_be_executor");
      const { data } = await service
        .from("tasks")
        .select("id")
        .eq("title", row.title);
      expect(data).toEqual([]);
    });
  });

  describe("update fields", () => {
    it("should affect no rows and keep title when executor edits own task", async () => {
      const task = await newTask();

      const { data, error } = await users.executorA.client
        .from("tasks")
        .update({ title: "hacked" })
        .eq("id", task.id)
        .select();

      expect(error).toBeNull();
      expect(data).toEqual([]);
      const { data: row } = await service
        .from("tasks")
        .select("title")
        .eq("id", task.id)
        .single();
      expect(row?.title).toBe(task.title);
    });

    it("should allow title edit and assignee change when task is new", async () => {
      const task = await newTask();

      const { data, error } = await users.manager.client
        .from("tasks")
        .update({ title: "renamed", assignee_id: users.executorB.id })
        .eq("id", task.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.title).toBe("renamed");
      expect(data.assignee_id).toBe(users.executorB.id);
    });

    it.each(["in_progress", "review", "rework"] as const)(
      "should allow title edit when task is %s",
      async (status) => {
        const task = await createTaskInStatus(
          users.manager,
          objectId,
          users.executorA.id,
          status,
        );

        const { data, error } = await users.manager.client
          .from("tasks")
          .update({ title: `renamed-${status}` })
          .eq("id", task.id)
          .select()
          .single();

        expect(error).toBeNull();
        expect(data.title).toBe(`renamed-${status}`);
      },
    );

    it("should reject with assignee_must_be_executor and keep assignee when a new task is reassigned to a manager", async () => {
      const task = await newTask();

      const { error } = await users.manager.client
        .from("tasks")
        .update({ assignee_id: users.manager2.id })
        .eq("id", task.id);

      expect(error?.message).toContain("assignee_must_be_executor");
      const { data } = await service
        .from("tasks")
        .select("assignee_id")
        .eq("id", task.id)
        .single();
      expect(data?.assignee_id).toBe(users.executorA.id);
    });

    it("should reject with task_fields_locked when assignee changes after work started", async () => {
      const task = await createTaskInStatus(
        users.manager,
        objectId,
        users.executorA.id,
        "in_progress",
      );

      const { error } = await users.manager.client
        .from("tasks")
        .update({ assignee_id: users.executorB.id })
        .eq("id", task.id);

      expect(error?.message).toContain("task_fields_locked");
    });

    it("should reject with task_fields_locked when object changes after work started", async () => {
      const task = await createTaskInStatus(
        users.manager,
        objectId,
        users.executorA.id,
        "in_progress",
      );
      const other = await createObject(users.manager);

      const { error } = await users.manager.client
        .from("tasks")
        .update({ object_id: other.id })
        .eq("id", task.id);

      expect(error?.message).toContain("task_fields_locked");
    });

    it("should reject with task_accepted_readonly when title of accepted task is edited", async () => {
      const task = await createTaskInStatus(
        users.manager,
        objectId,
        users.executorA.id,
        "accepted",
      );

      const { error } = await users.manager.client
        .from("tasks")
        .update({ title: "late edit" })
        .eq("id", task.id);

      expect(error?.message).toContain("task_accepted_readonly");
    });
  });

  describe("delete", () => {
    it("should affect no rows and keep the task when executor deletes own task", async () => {
      const task = await newTask();

      const { data, error } = await users.executorA.client
        .from("tasks")
        .delete()
        .eq("id", task.id)
        .select();

      expect(error).toBeNull();
      expect(data).toEqual([]);
      expect(await readStatus(task.id)).toBe("new");
    });
  });
});
