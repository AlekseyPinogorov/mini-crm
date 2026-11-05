import { useState, type FormEvent } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import { createTask, updateTask, type TaskFormValues } from "../api/tasks";
import { getErrorMessage } from "../errorMessages";
import { getEditPermissions } from "../tasks/taskRules";
import type { TaskStatus } from "../types";

interface Option {
  id: string;
  name: string;
}

export function TaskFormDialog(props: {
  task?: TaskFormValues & { id: string; status: TaskStatus };
  objectId: string;
  executors: Option[];
  /** Needed only when editing: a new task may move to another object. */
  objects?: Option[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { task } = props;
  const { canEditText, canReassign } = task
    ? getEditPermissions(task.status)
    : { canEditText: true, canReassign: true };
  // Copy only the editable columns: the loaded task also carries joined rows
  // (object, assignee, author) that the update must not send.
  const [values, setValues] = useState<TaskFormValues>(
    task
      ? {
          title: task.title,
          description: task.description,
          assignee_id: task.assignee_id,
          object_id: task.object_id,
        }
      : {
          title: "",
          description: "",
          assignee_id: "",
          object_id: props.objectId,
        },
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set =
    (field: keyof TaskFormValues) => (e: { target: { value: string } }) =>
      setValues({ ...values, [field]: e.target.value });

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const cleaned = {
      ...values,
      title: values.title.trim(),
      description: values.description.trim(),
    };
    try {
      if (!task) await createTask(cleaned);
      // Send only the fields the current status allows; the database rejects the rest anyway.
      else if (canReassign) await updateTask(task.id, cleaned);
      else
        await updateTask(task.id, {
          title: cleaned.title,
          description: cleaned.description,
        });
      props.onSaved();
    } catch (e) {
      setError(getErrorMessage(e));
      setPending(false);
    }
  }

  return (
    <Dialog
      open
      onClose={props.onClose}
      maxWidth="sm"
      fullWidth
      component="form"
      onSubmit={submit}
    >
      <DialogTitle>{task ? "Изменить задачу" : "Новая задача"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="Название"
            value={values.title}
            onChange={set("title")}
            required
            autoFocus
            disabled={!canEditText}
          />
          <TextField
            label="Описание"
            value={values.description}
            onChange={set("description")}
            multiline
            minRows={3}
            disabled={!canEditText}
          />
          <TextField
            select
            label="Исполнитель"
            value={values.assignee_id}
            onChange={set("assignee_id")}
            required
            disabled={!canReassign}
            helperText={
              canReassign
                ? undefined
                : "Исполнителя можно сменить только у новой задачи"
            }
          >
            {props.executors.map((executor) => (
              <MenuItem key={executor.id} value={executor.id}>
                {executor.name}
              </MenuItem>
            ))}
          </TextField>
          {task && props.objects && canReassign && (
            <TextField
              select
              label="Объект"
              value={values.object_id}
              onChange={set("object_id")}
              required
            >
              {props.objects.map((object) => (
                <MenuItem key={object.id} value={object.id}>
                  {object.name}
                </MenuItem>
              ))}
            </TextField>
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose} disabled={pending}>
          Отмена
        </Button>
        <Button type="submit" variant="contained" loading={pending}>
          Сохранить
        </Button>
      </DialogActions>
    </Dialog>
  );
}
