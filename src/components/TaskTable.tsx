import {
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router";
import { formatDate } from "../format";
import type { TaskStatus } from "../types";
import { StatusChip } from "./StatusChip";

export interface TaskRow {
  id: string;
  title: string;
  status: TaskStatus;
  created_at: string;
  /** Assignee on an object page, object name on "My tasks". */
  context: string;
}

export function TaskTable({
  rows,
  contextLabel,
}: {
  rows: TaskRow[];
  contextLabel: string;
}) {
  if (rows.length === 0) {
    return <Typography color="text.secondary">Задач пока нет.</Typography>;
  }
  return (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 640 }}>
        <TableHead>
          <TableRow>
            <TableCell>Задача</TableCell>
            <TableCell>{contextLabel}</TableCell>
            <TableCell>Статус</TableCell>
            <TableCell>Создана</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <Link component={RouterLink} to={`/tasks/${row.id}`}>
                  {row.title}
                </Link>
              </TableCell>
              <TableCell>{row.context}</TableCell>
              <TableCell>
                <StatusChip status={row.status} />
              </TableCell>
              <TableCell sx={{ color: "text.secondary" }}>
                {formatDate(row.created_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
