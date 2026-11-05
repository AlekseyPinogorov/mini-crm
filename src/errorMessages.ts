// Keys are the exception messages raised by the database (see migrations).
const databaseErrors: Record<string, string> = {
  not_authenticated: "Нет доступа: войдите заново.",
  task_not_found: "Задача не найдена или недоступна.",
  transition_not_allowed: "Этот переход статуса недоступен. Обновите страницу.",
  comment_required: "Укажите комментарий.",
  assignee_must_be_executor:
    "Исполнителем может быть только пользователь с ролью «Исполнитель».",
  task_accepted_readonly: "Принятую задачу нельзя изменить.",
  task_fields_locked:
    "Объект и исполнителя можно менять только у новой задачи.",
};

export function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const { message, code } = error as { message?: unknown; code?: unknown };
    if (typeof message === "string") {
      const key = Object.keys(databaseErrors).find((k) => message.includes(k));
      if (key) return databaseErrors[key];
    }
    if (code === "42501") return "Недостаточно прав для этого действия.";
  }
  return "Не удалось выполнить действие. Попробуйте ещё раз.";
}
