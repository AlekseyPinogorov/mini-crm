import { Chip } from "@mui/material";
import { statusLabels } from "../tasks/statusLabels";
import { statusChipColors } from "../theme";
import type { TaskStatus } from "../types";

export function StatusChip({ status }: { status: TaskStatus }) {
  const { bg, fg } = statusChipColors[status];
  return (
    <Chip
      size="small"
      label={statusLabels[status]}
      sx={{ bgcolor: bg, color: fg }}
    />
  );
}
