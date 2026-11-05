import { beforeAll, describe, expect, it } from "vitest";
import {
  createObject,
  createTask,
  createTaskInStatus,
  readHistory,
  service,
  setupUsers,
  type Users,
} from "./helpers";

describe("task_history", () => {
  let users: Users;
  let object: { id: string; name: string };
  let task: { id: string; title: string };
  let rowsBefore: number;

  const actors = ["manager", "executorA"] as const;

  beforeAll(async () => {
    users = await setupUsers();
    object = await createObject(users.manager);
    task = await createTask(users.manager, object.id, users.executorA.id);
    rowsBefore = (await readHistory(task.id)).length;
  });

  describe("creation", () => {
    it("should record a created row with task and object snapshot when a task is created", async () => {
      const rows = await readHistory(task.id);

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        event: "created",
        to_status: "new",
        actor_id: users.manager.id,
        task_title: task.title,
        object_name: object.name,
      });
    });
  });

  describe("insert", () => {
    it.each(actors)(
      "should reject with 42501 and add nothing when %s inserts a row",
      async (actor) => {
        const { error } = await users[actor].client
          .from("task_history")
          .insert({
            task_id: task.id,
            task_title: "forged",
            object_name: "forged",
            event: "created",
          });

        expect(error?.code).toBe("42501");
        expect(await readHistory(task.id)).toHaveLength(rowsBefore);
      },
    );
  });

  describe("update", () => {
    it.each(actors)(
      "should reject with 42501 and keep rows when %s rewrites history",
      async (actor) => {
        const { error } = await users[actor].client
          .from("task_history")
          .update({ comment: "rewritten" })
          .eq("task_id", task.id)
          .select();

        expect(error?.code).toBe("42501");
        expect(
          (await readHistory(task.id)).some((r) => r.comment === "rewritten"),
        ).toBe(false);
      },
    );
  });

  describe("delete", () => {
    it.each(actors)(
      "should reject with 42501 and keep rows when %s deletes history",
      async (actor) => {
        const { error } = await users[actor].client
          .from("task_history")
          .delete()
          .eq("task_id", task.id)
          .select();

        expect(error?.code).toBe("42501");
        expect(await readHistory(task.id)).toHaveLength(rowsBefore);
      },
    );
  });

  describe("task deletion", () => {
    it("should keep history and add a deleted snapshot when manager deletes a task", async () => {
      const own = await createTaskInStatus(
        users.manager,
        object.id,
        users.executorA.id,
        "in_progress",
      );

      const { error } = await users.manager.client
        .from("tasks")
        .delete()
        .eq("id", own.id);

      expect(error).toBeNull();
      const rows = await readHistory(own.id);
      expect(rows.map((r) => r.event)).toEqual(["created", "deleted"]);
      const deleted = rows[1];
      expect(deleted.task_title).toBe(own.title);
      expect(deleted.object_name).toBe(object.name);
      expect(deleted.actor_id).toBe(users.manager.id);
      expect(deleted.from_status).toBe("in_progress");
    });
  });

  describe("object deletion", () => {
    it("should delete its tasks and write a deleted row per task when manager deletes an object", async () => {
      const doomed = await createObject(users.manager);
      const t1 = await createTask(users.manager, doomed.id, users.executorA.id);
      const t2 = await createTask(users.manager, doomed.id, users.executorB.id);

      const { error } = await users.manager.client
        .from("objects")
        .delete()
        .eq("id", doomed.id);

      expect(error).toBeNull();
      const { data: left } = await service
        .from("tasks")
        .select("id")
        .eq("object_id", doomed.id);
      expect(left).toEqual([]);
      for (const t of [t1, t2]) {
        const deleted = (await readHistory(t.id)).filter(
          (r) => r.event === "deleted",
        );
        expect(deleted).toHaveLength(1);
        expect(deleted[0].object_name).toBe(doomed.name);
        expect(deleted[0].task_title).toBe(t.title);
      }
    });
  });
});
