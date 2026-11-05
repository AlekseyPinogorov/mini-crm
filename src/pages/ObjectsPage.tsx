import { useState } from "react";
import {
  Button,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import {
  Link as RouterLink,
  useLoaderData,
  useRevalidator,
} from "react-router";
import { ObjectFormDialog } from "../components/ObjectFormDialog";
import { PageHeader } from "../components/PageHeader";
import type { objectsLoader } from "../loaders";
import { useProfile } from "../useProfile";

export function ObjectsPage() {
  const objects = useLoaderData<typeof objectsLoader>();
  const profile = useProfile();
  const revalidator = useRevalidator();
  const [creating, setCreating] = useState(false);

  return (
    <Stack spacing={2.5}>
      <PageHeader
        title="Объекты"
        actions={
          profile.role === "manager" && (
            <Button variant="contained" onClick={() => setCreating(true)}>
              Новый объект
            </Button>
          )
        }
      />
      {objects.length === 0 ? (
        <Typography color="text.secondary">Объектов пока нет.</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 560 }}>
            <TableHead>
              <TableRow>
                <TableCell>Название</TableCell>
                <TableCell>Адрес</TableCell>
                <TableCell align="right">
                  {profile.role === "manager" ? "Задач" : "Моих задач"}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {objects.map((object) => (
                <TableRow key={object.id}>
                  <TableCell>
                    <Link component={RouterLink} to={`/objects/${object.id}`}>
                      {object.name}
                    </Link>
                  </TableCell>
                  <TableCell sx={{ color: "text.secondary" }}>
                    {object.address}
                  </TableCell>
                  <TableCell align="right">{object.taskCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {creating && (
        <ObjectFormDialog
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void revalidator.revalidate();
          }}
        />
      )}
    </Stack>
  );
}
