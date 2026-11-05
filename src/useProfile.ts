import { useRouteLoaderData } from "react-router";
import type { Profile } from "./types";

/** Signed-in user's profile, loaded once by the root route loader. */
export function useProfile(): Profile {
  const profile = useRouteLoaderData<Profile>("root");
  if (!profile) throw new Error("useProfile must be used under the root route");
  return profile;
}
