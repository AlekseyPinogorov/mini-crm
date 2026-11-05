import type { Profile, StatusTransition, TaskStatus } from "../types";

/**
 * Transitions the UI may offer. Mirrors transition_task in the database,
 * which is the actual enforcement point.
 */
export function getAvailableTransitions(
  task: { status: TaskStatus; assignee_id: string },
  user: Pick<Profile, "id" | "role">,
  transitions: StatusTransition[],
): StatusTransition[] {
  if (user.role === "executor" && task.assignee_id !== user.id) return [];
  return transitions.filter(
    (transition) =>
      transition.from_status === task.status &&
      transition.actor_role === user.role,
  );
}

/** Manager edit rules; mirrors guard_task_edit in the database. */
export function getEditPermissions(status: TaskStatus) {
  return { canEditText: status !== "accepted", canReassign: status === "new" };
}
