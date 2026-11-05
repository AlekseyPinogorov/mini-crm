import { Navigate } from "react-router";
import { useProfile } from "../useProfile";

export function HomeRedirect() {
  const profile = useProfile();
  return (
    <Navigate
      to={profile.role === "executor" ? "/my-tasks" : "/objects"}
      replace
    />
  );
}
