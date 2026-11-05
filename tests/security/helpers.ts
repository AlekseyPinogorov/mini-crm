import "dotenv/config";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { TaskStatus, UserRole } from "../../src/types";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value)
    throw new Error(
      `Missing env var ${name}; see .env for local Supabase keys`,
    );
  return value;
}

const url = requireEnv("SUPABASE_URL");
// README has users put cloud values in .env to seed; these tests create users
// and rows with the service key, so they must never reach a hosted project.
if (!["localhost", "127.0.0.1"].includes(new URL(url).hostname)) {
  throw new Error(`Security tests run only against local Supabase, got ${url}`);
}
const anonKey = requireEnv("SUPABASE_ANON_KEY");
const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false },
};

/** Arrangement and out-of-band verification only; never used for the Act step. */
export const service: SupabaseClient = createClient(
  url,
  serviceKey,
  clientOptions,
);

export function createAnonClient(): SupabaseClient {
  return createClient(url, anonKey, clientOptions);
}

export interface Actor {
  id: string;
  client: SupabaseClient;
}

async function createActor(
  label: string,
  role: UserRole | null,
): Promise<Actor> {
  const email = `${label}-${randomUUID()}@security.test`;
  const password = randomUUID();

  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error) throw created.error;
  const id = created.data.user.id;

  if (role) {
    const profile = await service
      .from("profiles")
      .insert({ id, full_name: label, role });
    if (profile.error) throw profile.error;
  }

  const client = createAnonClient();
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;
  return { id, client };
}

export async function setupUsers() {
  const [manager, manager2, executorA, executorB, noProfile] =
    await Promise.all([
      createActor("manager", "manager"),
      createActor("manager2", "manager"),
      createActor("executorA", "executor"),
      createActor("executorB", "executor"),
      createActor("noprofile", null),
    ]);
  return { manager, manager2, executorA, executorB, noProfile };
}

export type Users = Awaited<ReturnType<typeof setupUsers>>;

export async function createObject(manager: Actor) {
  const { data, error } = await manager.client
    .from("objects")
    .insert({ name: `object-${randomUUID()}`, address: "Test street 1" })
    .select()
    .single();
  if (error) throw error;
  return data as { id: string; name: string };
}

export async function createTask(
  manager: Actor,
  objectId: string,
  assigneeId: string,
) {
  const { data, error } = await manager.client
    .from("tasks")
    .insert({
      object_id: objectId,
      title: `task-${randomUUID()}`,
      description: "security test",
      assignee_id: assigneeId,
    })
    .select()
    .single();
  if (error) throw error;
  return data as { id: string; title: string };
}

export async function transition(
  actor: Actor,
  taskId: string,
  to: TaskStatus,
  comment?: string,
) {
  const { error } = await actor.client.rpc("transition_task", {
    p_task_id: taskId,
    p_to_status: to,
    p_comment: comment ?? null,
  });
  if (error) throw error;
}

/** Arranges a status without relying on transition_task; no user may do this. */
export async function setStatus(taskId: string, status: TaskStatus) {
  const { error } = await service
    .from("tasks")
    .update({ status })
    .eq("id", taskId);
  if (error) throw error;
}

export async function createTaskInStatus(
  manager: Actor,
  objectId: string,
  assigneeId: string,
  status: TaskStatus,
) {
  const task = await createTask(manager, objectId, assigneeId);
  if (status !== "new") await setStatus(task.id, status);
  return task;
}

export async function readStatus(taskId: string): Promise<string | undefined> {
  const { data } = await service
    .from("tasks")
    .select("status")
    .eq("id", taskId)
    .maybeSingle();
  return data?.status;
}

export async function readHistory(taskId: string) {
  const { data, error } = await service
    .from("task_history")
    .select("*")
    .eq("task_id", taskId)
    .order("id", { ascending: true });
  if (error) throw error;
  return data as Array<{
    event: string;
    from_status: string | null;
    to_status: string | null;
    actor_id: string | null;
    comment: string | null;
    task_title: string;
    object_name: string;
  }>;
}
