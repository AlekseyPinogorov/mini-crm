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
import { createObject, updateObject } from "../api/objects";
import { getErrorMessage } from "../errorMessages";

export function ObjectFormDialog(props: {
  object?: { id: string; name: string; address: string };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(props.object?.name ?? "");
  const [address, setAddress] = useState(props.object?.address ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const values = { name: name.trim(), address: address.trim() };
      await (props.object
        ? updateObject(props.object.id, values)
        : createObject(values));
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
      <DialogTitle>
        {props.object ? "Изменить объект" : "Новый объект"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="Название"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
          <TextField
            label="Адрес"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
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
