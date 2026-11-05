import { createTheme } from "@mui/material/styles";
import type { TaskStatus } from "./types";

export const theme = createTheme({
  palette: {
    primary: { main: "#2B5F8E" },
    error: { main: "#B03A2E" },
    background: { default: "#F6F7F9", paper: "#FFFFFF" },
    text: { primary: "#1D2329", secondary: "#5B6470" },
    divider: "#E3E6EA",
  },
  shape: { borderRadius: 6 },
  typography: {
    fontFamily: "Roboto, Arial, sans-serif",
    h1: { fontSize: 24, fontWeight: 600 },
    h2: { fontSize: 18, fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 500 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiPaper: { defaultProps: { variant: "outlined" } },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: "inherit", position: "static" },
      styleOverrides: { root: { borderBottom: "1px solid #E3E6EA" } },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { color: "#5B6470", fontWeight: 500, fontSize: 13 },
      },
    },
    MuiChip: { styleOverrides: { root: { fontWeight: 400 } } },
  },
});

export const statusChipColors: Record<TaskStatus, { bg: string; fg: string }> =
  {
    new: { bg: "#EEF0F2", fg: "#3F4650" },
    in_progress: { bg: "#E6EEF7", fg: "#24507A" },
    review: { bg: "#FBF1DC", fg: "#7A5410" },
    accepted: { bg: "#E5F2EA", fg: "#25613D" },
    rework: { bg: "#FBE9E4", fg: "#8A3B22" },
  };
