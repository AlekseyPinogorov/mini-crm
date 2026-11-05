import { useState } from "react";
import { Button, Link, Stack, Typography } from "@mui/material";
import {
  Link as RouterLink,
  useLoaderData,
  useNavigate,
  useRevalidator,
} from "react-router";
import { deleteObject } from "../api/objects";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { ObjectFormDialog } from "../components/ObjectFormDialog";
import { PageHeader } from "../components/PageHeader";
import { TaskFormDialog } from "../components/TaskFormDialog";
import { TaskTable } from "../components/TaskTable";
import type { objectLoader } from "../loaders";
import { useProfile } from "../useProfile";

type Dialog = "edit" | "delete" | "newTask" | null;

export function ObjectPage() {
  const { object, tasks, executors } = useLoaderData<typeof objectLoader>();
  const isManager = useProfile().role === "manager";
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const [dialog, setDialog] = useState<Dialog>(null);

  function onSaved() {
    setDialog(null);
    void revalidator.revalidate();
  }

  const rows = tasks.map((task) => ({
    ...task,
    context: task.assignee?.full_name ?? "",
  }));

  return (
    <Stack spacing={2.5}>
      <Link component={RouterLink} to="/objects" variant="body2">
        ← Объекты
      </Link>
      <PageHeader
        title={object.name}
        subtitle={object.address}
        actions={
          isManager && (
            <>
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => setDialog("edit")}
              >
                Изменить
              </Button>
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
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "center", pt: 1 }}
      >
        <Typography variant="h2">Задачи</Typography>
        {isManager && (
          <Button variant="contained" onClick={() => setDialog("newTask")}>
            Новая задача
          </Button>
        )}
      </Stack>
      <TaskTable rows={rows} contextLabel="Исполнитель" />

      {dialog === "edit" && (
        <ObjectFormDialog
          object={object}
          onClose={() => setDialog(null)}
          onSaved={onSaved}
        />
      )}
      {dialog === "newTask" && (
        <TaskFormDialog
          objectId={object.id}
          executors={executors.map((e) => ({ id: e.id, name: e.full_name }))}
          onClose={() => setDialog(null)}
          onSaved={onSaved}
        />
      )}
      {dialog === "delete" && (
        <ConfirmDialog
          title="Удалить объект?"
          text={
            tasks.length > 0
              ? `Вместе с объектом будут удалены задачи: ${tasks.length}. Записи об удалении останутся в истории.`
              : "Объект будет удалён."
          }
          confirmLabel="Удалить"
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            await deleteObject(object.id);
            navigate("/objects", { replace: true });
          }}
        />
      )}
    </Stack>
  );
}
