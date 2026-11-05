import { createBrowserRouter } from "react-router";
import { AppLayout } from "./components/AppLayout";
import { HomeRedirect } from "./components/HomeRedirect";
import { RouteError } from "./components/RouteError";
import {
  loginLoader,
  myTasksLoader,
  objectLoader,
  objectsLoader,
  rootLoader,
  taskLoader,
} from "./loaders";
import { LoginPage } from "./pages/LoginPage";
import { MyTasksPage } from "./pages/MyTasksPage";
import { ObjectPage } from "./pages/ObjectPage";
import { ObjectsPage } from "./pages/ObjectsPage";
import { TaskPage } from "./pages/TaskPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    loader: loginLoader,
    element: <LoginPage />,
    errorElement: <RouteError />,
  },
  {
    id: "root",
    path: "/",
    loader: rootLoader,
    element: <AppLayout />,
    errorElement: <RouteError />,
    // Re-check the session only on navigation, not after every in-page mutation.
    shouldRevalidate: ({ currentUrl, nextUrl }) =>
      currentUrl.pathname !== nextUrl.pathname,
    children: [
      {
        errorElement: <RouteError />,
        children: [
          { index: true, element: <HomeRedirect /> },
          { path: "objects", loader: objectsLoader, element: <ObjectsPage /> },
          {
            path: "objects/:objectId",
            loader: objectLoader,
            element: <ObjectPage />,
          },
          { path: "tasks/:taskId", loader: taskLoader, element: <TaskPage /> },
          { path: "my-tasks", loader: myTasksLoader, element: <MyTasksPage /> },
        ],
      },
    ],
  },
]);
