import { useState } from "react";
import {
  Box,
  Button,
  Divider,
  Link,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import {
  Link as RouterLink,
  useLoaderData,
  useNavigate,
  useRevalidator,
} from "react-router";
import { deleteTask } from "../api/tasks";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { PageHeader } from "../components/PageHeader";
import { StatusChip } from "../components/StatusChip";
import { TaskFormDialog } from "../components/TaskFormDialog";
import { TaskHistory } from "../components/TaskHistory";
import { TransitionActions } from "../components/TransitionActions";
import { formatDateTime } from "../format";
import type { taskLoader } from "../loaders";
import {
  getAvailableTransitions,
  getEditPermissions,
} from "../tasks/taskRules";
import { useProfile } from "../useProfile";

export function TaskPage() {
  const { task, history, transitions, executors, objects } =
    useLoaderData<typeof taskLoader>();
  const profile = useProfile();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null);

  const isManager = profile.role === "manager";
  const { canEditText } = getEditPermissions(task.status);
  const available = getAvailableTransitions(task, profile, transitions);
  const refresh = () => void revalidator.revalidate();

  const details = [
    ["Объект", task.object?.name],
    ["Исполнитель", task.assignee?.full_name],
    ["Автор", task.author?.full_name],
    ["Создана", formatDateTime(task.created_at)],
  ];

  return (
    <Stack spacing={2.5}>
      <Link
        component={RouterLink}
        to={`/objects/${task.object_id}`}
        variant="body2"
      >
        ← {task.object?.name}
      </Link>
      <PageHeader
        title={task.title}
        badge={<StatusChip status={task.status} />}
        actions={
          isManager && (
            <>
              {canEditText && (
                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={() => setDialog("edit")}
                >
                  Изменить
                </Button>
              )}
              <Button
                variant="outlined"
                color="error"
                onClick={() => setDialog("delete")}
              >
                Удалить
              </Button>
            </>
          )
        }
      />
      <Paper sx={{ p: 2.5 }}>
        <Stack spacing={2}>
          {task.description && (
            <Typography sx={{ whiteSpace: "pre-line" }}>
              {task.description}
            </Typography>
          )}
          <Box
            component="dl"
            sx={{
              m: 0,
              display: "grid",
              gap: 2,
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            }}
          >
            {details.map(([label, value]) => (
              <div key={label}>
                <Typography
                  component="dt"
                  variant="caption"
                  color="text.secondary"
                >
                  {label}
                </Typography>
                <Typography
                  component="dd"
                  variant="body2"
                  sx={{ m: 0, mt: 0.5 }}
                >
                  {value ?? "—"}
                </Typography>
              </div>
            ))}
          </Box>
          {available.length > 0 && <Divider />}
          <TransitionActions
            taskId={task.id}
            transitions={available}
            onDone={refresh}
          />
        </Stack>
      </Paper>

      <Typography variant="h2">История</Typography>
      <TaskHistory entries={history} />

      {dialog === "edit" && (
        <TaskFormDialog
          task={task}
          objectId={task.object_id}
          executors={executors.map((e) => ({ id: e.id, name: e.full_name }))}
          objects={objects.map((o) => ({ id: o.id, name: o.name }))}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            refresh();
          }}
        />
      )}
      {dialog === "delete" && (
        <ConfirmDialog
          title="Удалить задачу?"
          text="Задача будет удалена. Запись об удалении останется в истории."
          confirmLabel="Удалить"
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            await deleteTask(task.id);
            navigate(`/objects/${task.object_id}`, { replace: true });
          }}
        />
      )}
    </Stack>
  );
}
