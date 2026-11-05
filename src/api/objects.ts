import { supabase } from "../supabaseClient";

export async function listObjects() {
  const { data, error } = await supabase
    .from("objects")
    .select("id, name, address, tasks(count)")
    .order("name");
  if (error) throw error;
  return data.map(({ tasks, ...object }) => ({
    ...object,
    taskCount: tasks[0]?.count ?? 0,
  }));
}

export async function getObject(id: string) {
  const { data, error } = await supabase
    .from("objects")
    .select("id, name, address")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createObject(values: { name: string; address: string }) {
  const { error } = await supabase.from("objects").insert(values);
  if (error) throw error;
}

export async function updateObject(
  id: string,
  values: { name: string; address: string },
) {
  const { error } = await supabase.from("objects").update(values).eq("id", id);
  if (error) throw error;
}

export async function deleteObject(id: string) {
  const { error } = await supabase.from("objects").delete().eq("id", id);
  if (error) throw error;
}
