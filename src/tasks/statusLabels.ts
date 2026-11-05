import type { TaskStatus, UserRole } from "../types";

export const statusLabels: Record<TaskStatus, string> = {
  new: "Новая",
  in_progress: "В работе",
  review: "На проверке",
  accepted: "Принята",
  rework: "На доработке",
};

/** Button captions are actions, not status names: "Взять в работу", not "В работе". */
export const transitionLabels: Record<TaskStatus, string> = {
  new: "Новая",
  in_progress: "Взять в работу",
  review: "Отправить на проверку",
  accepted: "Принять",
  rework: "Вернуть на доработку",
};

export const roleLabels: Record<UserRole, string> = {
  manager: "Постановщик",
  executor: "Исполнитель",
};
