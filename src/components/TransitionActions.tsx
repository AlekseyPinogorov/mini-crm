import { useState, type FormEvent } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import { transitionTask } from "../api/tasks";
import { getErrorMessage } from "../errorMessages";
import { transitionLabels } from "../tasks/statusLabels";
import type { StatusTransition, TaskStatus } from "../types";

export function TransitionActions(props: {
  taskId: string;
  transitions: StatusTransition[];
  onDone: () => void;
}) {
  const [pendingStatus, setPendingStatus] = useState<TaskStatus | null>(null);
  const [commentFor, setCommentFor] = useState<TaskStatus | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function run(toStatus: TaskStatus, withComment?: string) {
    setPendingStatus(toStatus);
    setError(null);
    try {
      await transitionTask(props.taskId, toStatus, withComment);
      setCommentFor(null);
      setComment("");
      props.onDone();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setPendingStatus(null);
    }
  }

  function submitComment(event: FormEvent) {
    event.preventDefault();
    if (commentFor) void run(commentFor, comment);
  }

  if (props.transitions.length === 0) return null;

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
        {props.transitions.map((transition, index) => (
          <Button
            key={transition.to_status}
            variant={index === 0 ? "contained" : "outlined"}
            loading={pendingStatus === transition.to_status && !commentFor}
            disabled={pendingStatus !== null}
            onClick={() =>
              transition.comment_required
                ? setCommentFor(transition.to_status)
                : run(transition.to_status)
            }
          >
            {transitionLabels[transition.to_status]}
          </Button>
        ))}
      </Stack>
      {error && !commentFor && <Alert severity="error">{error}</Alert>}

      <Dialog
        open={commentFor !== null}
        onClose={() => setCommentFor(null)}
        maxWidth="sm"
        fullWidth
        component="form"
        onSubmit={submitComment}
      >
        <DialogTitle>{commentFor && transitionLabels[commentFor]}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Комментарий"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              multiline
              minRows={3}
              required
              autoFocus
              helperText="Что нужно исправить"
            />
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setCommentFor(null)}
            disabled={pendingStatus !== null}
          >
            Отмена
          </Button>
          <Button
            type="submit"
            variant="contained"
            loading={pendingStatus !== null}
            disabled={comment.trim() === ""}
          >
            {commentFor && transitionLabels[commentFor]}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
