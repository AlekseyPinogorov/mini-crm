import { describe, it, expect } from "vitest";
import type { StatusTransition } from "../../types";
import { getAvailableTransitions, getEditPermissions } from "../taskRules";

const transitions = [
  {
    from_status: "new",
    to_status: "in_progress",
    actor_role: "executor",
    comment_required: false,
  },
  {
    from_status: "in_progress",
    to_status: "review",
    actor_role: "executor",
    comment_required: false,
  },
  {
    from_status: "review",
    to_status: "accepted",
    actor_role: "manager",
    comment_required: false,
  },
  {
    from_status: "review",
    to_status: "rework",
    actor_role: "manager",
    comment_required: true,
  },
  {
    from_status: "rework",
    to_status: "in_progress",
    actor_role: "executor",
    comment_required: false,
  },
] satisfies StatusTransition[];

const executor = { id: "executor-1", role: "executor" as const };
const manager = { id: "manager-1", role: "manager" as const };

describe("taskRules", () => {
  describe("getAvailableTransitions", () => {
    it("should return only in_progress when the assigned executor views a new task", () => {
      const task = { status: "new" as const, assignee_id: executor.id };

      const result = getAvailableTransitions(task, executor, transitions);

      expect(result.map((t) => t.to_status)).toEqual(["in_progress"]);
    });

    it("should return nothing when the executor is not the assignee", () => {
      const task = { status: "new" as const, assignee_id: "executor-2" };

      expect(getAvailableTransitions(task, executor, transitions)).toEqual([]);
    });

    it("should return nothing when the executor views a task in review", () => {
      const task = { status: "review" as const, assignee_id: executor.id };

      expect(getAvailableTransitions(task, executor, transitions)).toEqual([]);
    });

    it("should return accepted and rework with comment requirement when the manager views a task in review", () => {
      const task = { status: "review" as const, assignee_id: executor.id };

      const result = getAvailableTransitions(task, manager, transitions);

      expect(result.map((t) => [t.to_status, t.comment_required])).toEqual([
        ["accepted", false],
        ["rework", true],
      ]);
    });

    it("should return nothing when the manager views a new task", () => {
      const task = { status: "new" as const, assignee_id: executor.id };

      expect(getAvailableTransitions(task, manager, transitions)).toEqual([]);
    });

    it("should return nothing for any user when the task is accepted", () => {
      const task = { status: "accepted" as const, assignee_id: executor.id };

      expect(getAvailableTransitions(task, executor, transitions)).toEqual([]);
      expect(getAvailableTransitions(task, manager, transitions)).toEqual([]);
    });
  });

  describe("getEditPermissions", () => {
    it("should allow editing text and reassigning when the task is new", () => {
      expect(getEditPermissions("new")).toEqual({
        canEditText: true,
        canReassign: true,
      });
    });

    it.each(["in_progress", "review", "rework"] as const)(
      "should allow only editing text when the task is %s",
      (status) => {
        expect(getEditPermissions(status)).toEqual({
          canEditText: true,
          canReassign: false,
        });
      },
    );

    it("should forbid editing text and reassigning when the task is accepted", () => {
      expect(getEditPermissions("accepted")).toEqual({
        canEditText: false,
        canReassign: false,
      });
    });
  });
});
