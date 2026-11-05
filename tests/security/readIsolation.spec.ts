import { beforeAll, describe, expect, it } from "vitest";
import {
  createObject,
  createTask,
  service,
  setupUsers,
  type Users,
} from "./helpers";

describe("read isolation", () => {
  let users: Users;
  let objectA: { id: string };
  let objectB: { id: string };
  let taskA: { id: string };
  let taskB: { id: string };

  beforeAll(async () => {
    users = await setupUsers();
    objectA = await createObject(users.manager);
    objectB = await createObject(users.manager);
    taskA = await createTask(users.manager, objectA.id, users.executorA.id);
    taskB = await createTask(users.manager, objectB.id, users.executorB.id);
  });

  describe("tasks", () => {
    describe("select", () => {
      it("should return only own tasks when executor reads the table", async () => {
        const { data, error } = await users.executorA.client
          .from("tasks")
          .select("id");

        expect(error).toBeNull();
        expect(data!.map((t) => t.id)).toEqual([taskA.id]);
      });

      it("should return no rows when executor asks for a foreign task by id", async () => {
        const { data, error } = await users.executorA.client
          .from("tasks")
          .select("id")
          .eq("id", taskB.id);

        expect(error).toBeNull();
        expect(data).toEqual([]);
      });

      it("should return all tasks when manager reads the table", async () => {
        const { data } = await users.manager.client
          .from("tasks")
          .select("id")
          .in("id", [taskA.id, taskB.id]);

        expect(data).toHaveLength(2);
      });
    });
  });

  describe("objects", () => {
    describe("select", () => {
      it("should return only objects with own tasks when executor reads the table", async () => {
        const { data, error } = await users.executorA.client
          .from("objects")
          .select("id");

        expect(error).toBeNull();
        expect(data!.map((o) => o.id)).toEqual([objectA.id]);
      });

      it("should return no rows when executor asks for an object that has only foreign tasks", async () => {
        const { data } = await users.executorA.client
          .from("objects")
          .select("id")
          .eq("id", objectB.id);

        expect(data).toEqual([]);
      });
    });
  });

  describe("task_history", () => {
    describe("select", () => {
      it("should return history of own tasks including manager-written rows when executor reads", async () => {
        const { data, error } = await users.executorA.client
          .from("task_history")
          .select("task_id, actor_id, event");

        expect(error).toBeNull();
        expect(data).toEqual([
          { task_id: taskA.id, actor_id: users.manager.id, event: "created" },
        ]);
      });

      it("should return no rows when executor asks for history of a foreign task", async () => {
        const { data } = await users.executorA.client
          .from("task_history")
          .select("id")
          .eq("task_id", taskB.id);

        expect(data).toEqual([]);
      });

      it("should return history of every task when manager reads", async () => {
        const { data } = await users.manager.client
          .from("task_history")
          .select("task_id")
          .in("task_id", [taskA.id, taskB.id]);

        expect(new Set(data!.map((r) => r.task_id))).toEqual(
          new Set([taskA.id, taskB.id]),
        );
      });
    });
  });

  describe("profiles", () => {
    describe("select", () => {
      it("should return all profiles with id, name and role when executor reads", async () => {
        const { data, error } = await users.executorA.client
          .from("profiles")
          .select("id, full_name, role");

        expect(error).toBeNull();
        const byId = new Map(data!.map((p) => [p.id, p.role]));
        expect(byId.get(users.manager.id)).toBe("manager");
        expect(byId.get(users.executorB.id)).toBe("executor");
      });
    });

    describe("update", () => {
      it("should reject and keep the role when executor promotes themselves", async () => {
        const { error } = await users.executorA.client
          .from("profiles")
          .update({ role: "manager" })
          .eq("id", users.executorA.id)
          .select();

        expect(error?.code).toBe("42501");
        const { data } = await service
          .from("profiles")
          .select("role")
          .eq("id", users.executorA.id)
          .single();
        expect(data?.role).toBe("executor");
      });
    });
  });

  describe("user without profile", () => {
    describe("select", () => {
      it.each([
        "profiles",
        "objects",
        "tasks",
        "task_history",
        "task_status_transitions",
      ])("should return zero rows when reading %s", async (table) => {
        const { data, error } = await users.noProfile.client
          .from(table)
          .select("*");

        expect(error).toBeNull();
        expect(data).toEqual([]);
      });
    });
  });
});
