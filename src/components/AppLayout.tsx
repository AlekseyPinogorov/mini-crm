import {
  AppBar,
  Button,
  Container,
  LinearProgress,
  Link,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { NavLink, Outlet, useNavigate, useNavigation } from "react-router";
import { supabase } from "../supabaseClient";
import { roleLabels } from "../tasks/statusLabels";
import { useProfile } from "../useProfile";

export function AppLayout() {
  const profile = useProfile();
  const navigation = useNavigation();
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  return (
    <>
      <AppBar>
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ gap: 3, flexWrap: "wrap" }}>
            <Typography sx={{ fontWeight: 600 }}>Мини-CRM</Typography>
            <Stack direction="row" spacing={2.5} sx={{ flexGrow: 1 }}>
              {profile.role === "executor" && (
                <NavItem to="/my-tasks">Мои задачи</NavItem>
              )}
              <NavItem to="/objects">Объекты</NavItem>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {profile.full_name} · {roleLabels[profile.role]}
            </Typography>
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              onClick={signOut}
            >
              Выйти
            </Button>
          </Toolbar>
        </Container>
      </AppBar>
      {navigation.state === "loading" && <LinearProgress />}
      <Container maxWidth="lg" component="main" sx={{ py: 4 }}>
        <Outlet />
      </Container>
    </>
  );
}

function NavItem({ to, children }: { to: string; children: string }) {
  return (
    <Link
      component={NavLink}
      to={to}
      underline="none"
      color="text.secondary"
      variant="body2"
      sx={{ "&.active": { color: "text.primary", fontWeight: 500 } }}
    >
      {children}
    </Link>
  );
}
