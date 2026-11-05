import { Alert, Button, Container, Stack } from "@mui/material";
import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router";
import { supabase } from "../supabaseClient";

function describe(error: unknown) {
  if (isRouteErrorResponse(error)) {
    if (error.status === 403)
      return "Ваш профиль не настроен. Обратитесь к администратору.";
    if (error.status === 404)
      return "Страница не найдена или у вас нет к ней доступа.";
  }
  return "Не удалось загрузить данные. Проверьте соединение и обновите страницу.";
}

export function RouteError() {
  const error = useRouteError();
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Stack spacing={2}>
        <Alert severity="error">{describe(error)}</Alert>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" onClick={() => navigate("/")}>
            На главную
          </Button>
          <Button variant="outlined" onClick={signOut}>
            Выйти
          </Button>
        </Stack>
      </Stack>
    </Container>
  );
}
