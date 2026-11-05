import { beforeAll, describe, expect, it } from "vitest";
import {
  createObject,
  createTask,
  createTaskInStatus,
  readHistory,
  readStatus,
  setupUsers,
  transition,
  type Users,
} from "./helpers";
import type { TaskStatus } from "../../src/types";

// Many simultaneous pairs, because a single pair may serialize by luck and hide a missing row lock.
const RACES = 15;

describe("transition_task", () => {
  let users: Users;
  let objectId: string;

  const taskIn = (status: TaskStatus) =>
    createTaskInStatus(users.manager, objectId, users.executorA.id, status);
  const tasksIn = (status: TaskStatus) =>
    Promise.all(Array.from({ length: RACES }, () => taskIn(status)));
  const rpc = (
    actor: { client: Users["manager"]["client"] },
    id: string,
    to: string,
    comment: string | null = null,
  ) =>
    actor.client.rpc("transition_task", {
      p_task_id: id,
      p_to_status: to,
      p_comment: comment,
    });

  beforeAll(async () => {
    users = await setupUsers();
    objectId = (await createObject(users.manager)).id;
  });

  describe("full cycle", () => {
    it("should reach accepted and record every step in order when the cycle is followed", async () => {
      const task = await createTask(
        users.manager,
        objectId,
        users.executorA.id,
      );

      await transition(users.executorA, task.id, "in_progress");
      await transition(users.executorA, task.id, "review");
      await transition(users.manager, task.id, "rework", "  needs a fix  ");
      await transition(users.executorA, task.id, "in_progress");
      await transition(users.executorA, task.id, "review");
      await transition(users.manager, task.id, "accepted");

      expect(await readStatus(task.id)).toBe("accepted");
      const m = users.manager.id;
      const a = users.executorA.id;
      const rows = (await readHistory(task.id)).map((r) => [
        r.event,
        r.from_status,
        r.to_status,
        r.actor_id,
        r.comment,
      ]);
      expect(rows).toEqual([
        ["created", null, "new", m, null],
        ["status_changed", "new", "in_progress", a, null],
        ["status_changed", "in_progress", "review", a, null],
        ["status_changed", "review", "rework", m, "needs a fix"],
        ["status_changed", "rework", "in_progress", a, null],
        ["status_changed", "in_progress", "review", a, null],
        ["status_changed", "review", "accepted", m, null],
      ]);
    });
  });

  describe("forbidden callers and jumps", () => {
    it("should fail with not_authenticated when user has no profile", async () => {
      const task = await taskIn("new");

      const { error } = await rpc(users.noProfile, task.id, "in_progress");

      expect(error?.message).toContain("not_authenticated");
    });

    it("should fail with task_not_found when task does not exist", async () => {
      const { error } = await rpc(
        users.manager,
        crypto.randomUUID(),
        "accepted",
      );

      expect(error?.message).toContain("task_not_found");
    });

    it("should fail with task_not_found and keep status when executor moves a foreign task", async () => {
      const task = await taskIn("new");

      const { error } = await rpc(users.executorB, task.id, "in_progress");

      expect(error?.message).toContain("task_not_found");
      expect(await readStatus(task.id)).toBe("new");
    });

    it("should fail with transition_not_allowed when task jumps from new to accepted", async () => {
      const task = await taskIn("new");

      const { error } = await rpc(users.manager, task.id, "accepted");

      expect(error?.message).toContain("transition_not_allowed");
      expect(await readStatus(task.id)).toBe("new");
    });

    it.each([
      ["manager", "new", "in_progress"],
      ["manager", "rework", "in_progress"],
      ["manager", "in_progress", "review"],
      ["executorA", "in_progress", "accepted"],
      ["executorA", "review", "accepted"],
      ["executorA", "review", "rework"],
      ["manager", "accepted", "in_progress"],
      ["manager", "accepted", "rework"],
      ["executorA", "accepted", "in_progress"],
      ["executorA", "accepted", "rework"],
    ] as const)(
      "should fail with transition_not_allowed and keep status when %s moves a task from %s to %s",
      async (actor, from, to) => {
        const task = await taskIn(from);

        const { error } = await rpc(users[actor], task.id, to, "some comment");

        expect(error?.message).toContain("transition_not_allowed");
        expect(await readStatus(task.id)).toBe(from);
      },
    );
  });

  describe("acceptance", () => {
    it("should accept the task when a manager who is not the author reviews it", async () => {
      const task = await taskIn("review");

      const { error } = await rpc(users.manager2, task.id, "accepted");

      expect(error).toBeNull();
      expect(await readStatus(task.id)).toBe("accepted");
      const last = (await readHistory(task.id)).at(-1);
      expect(last?.actor_id).toBe(users.manager2.id);
    });
  });

  describe("rework comment", () => {
    it.each([
      ["no comment", null],
      ["whitespace-only comment", "   "],
      ["newline-only comment", "\n"],
      ["tab-only comment", "\t"],
      ["newline and tab comment", "\n\t"],
      ["carriage-return and newline comment", "\r\n"],
      ["CR, form-feed and vertical-tab comment", "\r\f\v"],
    ])(
      "should fail with comment_required and keep review when rework has %s",
      async (_label, comment) => {
        const task = await taskIn("review");

        const { error } = await rpc(users.manager, task.id, "rework", comment);

        expect(error?.message).toContain("comment_required");
        expect(await readStatus(task.id)).toBe("review");
      },
    );

    it("should store the comment without surrounding whitespace when it is wrapped in carriage returns, newlines and tabs", async () => {
      const task = await taskIn("review");

      const { error } = await rpc(
        users.manager,
        task.id,
        "rework",
        "\r\n\tПожалуйста, переделайте армирование\t\r\n",
      );

      expect(error).toBeNull();
      expect(await readStatus(task.id)).toBe("rework");
      const last = (await readHistory(task.id))
        .filter((r) => r.event === "status_changed")
        .at(-1);
      expect(last?.comment).toBe("Пожалуйста, переделайте армирование");
    });
  });

  describe("concurrency", () => {
    it("should let exactly one manager win per task when accepted and rework race from review", async () => {
      const tasks = await tasksIn("review");

      const results = await Promise.all(
        tasks.flatMap((t) => [
          rpc(users.manager, t.id, "accepted"),
          rpc(users.manager2, t.id, "rework", "please redo"),
        ]),
      );

      for (const [i, task] of tasks.entries()) {
        const [accept, rework] = [results[2 * i], results[2 * i + 1]];
        const acceptWon = accept.error === null;
        expect(
          [accept.error, rework.error].filter((e) => e === null),
        ).toHaveLength(1);
        const loser = acceptWon ? rework : accept;
        expect(loser.error?.message).toContain("transition_not_allowed");

        const winner = acceptWon ? "accepted" : "rework";
        expect(await readStatus(task.id)).toBe(winner);
        const fromReview = (await readHistory(task.id)).filter(
          (r) => r.event === "status_changed" && r.from_status === "review",
        );
        expect(fromReview).toHaveLength(1);
        expect(fromReview[0].to_status).toBe(winner);
      }
    });

    it("should let exactly one call pass per task when the executor submits for review twice at once", async () => {
      const tasks = await tasksIn("in_progress");

      const results = await Promise.all(
        tasks.flatMap((t) => [
          rpc(users.executorA, t.id, "review"),
          rpc(users.executorA, t.id, "review"),
        ]),
      );

      for (const [i, task] of tasks.entries()) {
        const pair = [results[2 * i], results[2 * i + 1]];
        expect(pair.filter((r) => r.error === null)).toHaveLength(1);
        expect(pair.find((r) => r.error)?.error?.message).toContain(
          "transition_not_allowed",
        );
        expect(await readStatus(task.id)).toBe("review");
        const toReview = (await readHistory(task.id)).filter(
          (r) => r.event === "status_changed" && r.to_status === "review",
        );
        expect(toReview).toHaveLength(1);
      }
    });
  });
});
