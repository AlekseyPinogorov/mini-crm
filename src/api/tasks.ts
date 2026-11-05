import { supabase } from "../supabaseClient";
import type { TaskStatus } from "../types";

export interface TaskFormValues {
  title: string;
  description: string;
  assignee_id: string;
  object_id: string;
}

export async function listObjectTasks(objectId: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id, title, status, created_at, assignee:profiles!tasks_assignee_id_fkey(full_name)",
    )
    .eq("object_id", objectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function listMyTasks(userId: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, status, created_at, object:objects(name)")
    .eq("assignee_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getTask(id: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select(
      `id, title, description, status, created_at, object_id, assignee_id,
       object:objects(name),
       assignee:profiles!tasks_assignee_id_fkey(full_name),
       author:profiles!tasks_author_id_fkey(full_name)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getTaskHistory(taskId: string) {
  const { data, error } = await supabase
    .from("task_history")
    .select(
      "id, event, from_status, to_status, comment, created_at, actor:profiles(full_name)",
    )
    .eq("task_id", taskId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (error) throw error;
  return data;
}

export async function listTransitions() {
  // Enum order puts 'accepted' before 'rework', so "Принять" stays the primary button.
  const { data, error } = await supabase
    .from("task_status_transitions")
    .select("*")
    .order("to_status");
  if (error) throw error;
  return data;
}

export async function listExecutors() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "executor")
    .order("full_name");
  if (error) throw error;
  return data;
}

export async function createTask(values: TaskFormValues) {
  const { error } = await supabase.from("tasks").insert(values);
  if (error) throw error;
}

export async function updateTask(id: string, values: Partial<TaskFormValues>) {
  const { error } = await supabase.from("tasks").update(values).eq("id", id);
  if (error) throw error;
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function transitionTask(
  taskId: string,
  toStatus: TaskStatus,
  comment?: string,
) {
  const { error } = await supabase.rpc("transition_task", {
    p_task_id: taskId,
    p_to_status: toStatus,
    p_comment: comment,
  });
  if (error) throw error;
}
