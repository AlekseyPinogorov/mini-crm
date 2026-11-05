const dateFormat = new Intl.DateTimeFormat("ru-RU", { dateStyle: "short" });
const dateTimeFormat = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "short",
  timeStyle: "short",
});

export const formatDate = (iso: string) => dateFormat.format(new Date(iso));
export const formatDateTime = (iso: string) =>
  dateTimeFormat.format(new Date(iso));
