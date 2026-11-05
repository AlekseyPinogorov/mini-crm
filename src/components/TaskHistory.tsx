import { List, ListItem, Paper, Stack, Typography } from "@mui/material";
import { formatDateTime } from "../format";
import { statusLabels } from "../tasks/statusLabels";
import type { TaskStatus } from "../types";

interface HistoryEntry {
  id: number;
  event: "created" | "status_changed" | "deleted";
  from_status: TaskStatus | null;
  to_status: TaskStatus | null;
  comment: string | null;
  created_at: string;
  actor: { full_name: string } | null;
}

function describe(entry: HistoryEntry) {
  if (entry.event === "created") return "Задача создана";
  if (entry.event === "deleted") return "Задача удалена";
  return `${statusLabels[entry.from_status!]} → ${statusLabels[entry.to_status!]}`;
}

export function TaskHistory({ entries }: { entries: HistoryEntry[] }) {
  return (
    <Paper>
      <List disablePadding>
        {entries.map((entry, index) => (
          <ListItem
            key={entry.id}
            divider={index < entries.length - 1}
            sx={{ display: "block", py: 1.5 }}
          >
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ flexWrap: "wrap", alignItems: "baseline" }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {entry.actor?.full_name ?? "Пользователь удалён"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {describe(entry)}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ ml: "auto" }}
              >
                {formatDateTime(entry.created_at)}
              </Typography>
            </Stack>
            {entry.comment && (
              <Typography
                variant="body2"
                sx={{
                  mt: 1,
                  px: 1.5,
                  py: 1,
                  bgcolor: "background.default",
                  borderRadius: 1,
                  whiteSpace: "pre-line",
                }}
              >
                {entry.comment}
              </Typography>
            )}
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}
