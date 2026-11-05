import type { Database, Tables } from "./database.types";

export type TaskStatus = Database["public"]["Enums"]["task_status"];
export type UserRole = Database["public"]["Enums"]["user_role"];
export type Profile = Tables<"profiles">;
export type StatusTransition = Tables<"task_status_transitions">;
