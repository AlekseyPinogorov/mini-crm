import type { ReactNode } from "react";
import { Stack, Typography } from "@mui/material";

export function PageHeader(props: {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Stack
      direction="row"
      spacing={2}
      useFlexGap
      sx={{
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "flex-start",
      }}
    >
      <Stack spacing={0.5}>
        <Stack
          direction="row"
          spacing={1.5}
          useFlexGap
          sx={{ flexWrap: "wrap", alignItems: "center" }}
        >
          <Typography variant="h1">{props.title}</Typography>
          {props.badge}
        </Stack>
        {props.subtitle && (
          <Typography color="text.secondary">{props.subtitle}</Typography>
        )}
      </Stack>
      {props.actions && (
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
          {props.actions}
        </Stack>
      )}
    </Stack>
  );
}
