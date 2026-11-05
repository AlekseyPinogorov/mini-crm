import { Stack } from "@mui/material";
import { useLoaderData } from "react-router";
import { PageHeader } from "../components/PageHeader";
import { TaskTable } from "../components/TaskTable";
import type { myTasksLoader } from "../loaders";

export function MyTasksPage() {
  const tasks = useLoaderData<typeof myTasksLoader>();
  // Accepted tasks are finished, so they sink below the ones still needing work.
  // Array.sort is stable, so the loader's newest-first order holds within each group.
  const rows = tasks
    .map((task) => ({ ...task, context: task.object?.name ?? "" }))
    .sort(
      (a, b) =>
        Number(a.status === "accepted") - Number(b.status === "accepted"),
    );

  return (
    <Stack spacing={2.5}>
      <PageHeader title="Мои задачи" />
      <TaskTable rows={rows} contextLabel="Объект" />
    </Stack>
  );
}
