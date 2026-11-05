import { data, redirect, type LoaderFunctionArgs } from "react-router";
import { getObject, listObjects } from "./api/objects";
import {
  getTask,
  getTaskHistory,
  listExecutors,
  listMyTasks,
  listObjectTasks,
  listTransitions,
} from "./api/tasks";
import { supabase } from "./supabaseClient";

async function requireSession() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) throw redirect("/login");
  return sessionData.session;
}

export async function rootLoader() {
  const session = await requireSession();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", session.user.id)
    .maybeSingle();
  if (error) throw error;
  // Accounts are created by an admin; one without a profile has no role and no access.
  if (!profile) throw data("no_profile", { status: 403 });
  return profile;
}

export async function loginLoader() {
  const { data: sessionData } = await supabase.auth.getSession();
  return sessionData.session ? redirect("/") : null;
}

export const objectsLoader = () => listObjects();

export async function objectLoader({ params }: LoaderFunctionArgs) {
  const id = params.objectId ?? "";
  const [object, tasks, executors] = await Promise.all([
    getObject(id),
    listObjectTasks(id),
    listExecutors(),
  ]);
  if (!object) throw data("not_found", { status: 404 });
  return { object, tasks, executors };
}

export async function taskLoader({ params }: LoaderFunctionArgs) {
  const id = params.taskId ?? "";
  const [task, history, transitions, executors, objects] = await Promise.all([
    getTask(id),
    getTaskHistory(id),
    listTransitions(),
    listExecutors(),
    listObjects(),
  ]);
  if (!task) throw data("not_found", { status: 404 });
  return { task, history, transitions, executors, objects };
}

export async function myTasksLoader() {
  const session = await requireSession();
  return listMyTasks(session.user.id);
}
