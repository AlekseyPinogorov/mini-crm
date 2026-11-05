-- Access rules. Every rule here must hold for direct REST calls with a user
-- token, so nothing relies on the UI hiding a button.

-- Supabase grants everything on new public tables to anon and authenticated by
-- default. Start from zero and grant back only what each role needs.
revoke all on table public.profiles, public.objects, public.tasks, public.task_history
  from anon, authenticated;

alter table public.profiles enable row level security;
alter table public.objects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_history enable row level security;

-- SECURITY DEFINER so policies on profiles can ask for the caller's role
-- without re-entering the profiles policy (infinite RLS recursion).
-- Returns null for a user without a profile, which every policy treats as "no access".
create function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid()
$$;

revoke execute on function public.current_user_role() from public, anon;
grant execute on function public.current_user_role() to authenticated;

-- profiles: readable by any user who has a profile (names for authors,
-- history and the assignee picker). No write grants: only an admin with the
-- service key changes roles, so a user cannot promote themselves.
grant select on public.profiles to authenticated;

create policy profiles_select on public.profiles
  for select to authenticated
  using ((select public.current_user_role()) is not null);

-- objects: created_by and created_at are not grantable, so the database
-- always fills them from defaults; a client that sends them gets 42501.
grant select, delete on public.objects to authenticated;
grant insert (name, address), update (name, address) on public.objects to authenticated;

create policy objects_select on public.objects
  for select to authenticated
  using (
    (select public.current_user_role()) = 'manager'
    or exists (
      select 1 from public.tasks
      where tasks.object_id = objects.id
        and tasks.assignee_id = (select auth.uid())
    )
  );

create policy objects_insert on public.objects
  for insert to authenticated
  with check ((select public.current_user_role()) = 'manager');

create policy objects_update on public.objects
  for update to authenticated
  using ((select public.current_user_role()) = 'manager')
  with check ((select public.current_user_role()) = 'manager');

create policy objects_delete on public.objects
  for delete to authenticated
  using ((select public.current_user_role()) = 'manager');

-- tasks: status, author_id and created_at are deliberately not grantable.
-- A new task can only start in the default 'new' status, and status can only
-- change inside transition_task (SECURITY DEFINER, runs as table owner).
grant select, delete on public.tasks to authenticated;
grant insert (object_id, title, description, assignee_id),
      update (object_id, title, description, assignee_id)
  on public.tasks to authenticated;

create policy tasks_select on public.tasks
  for select to authenticated
  using (
    (select public.current_user_role()) = 'manager'
    or assignee_id = (select auth.uid())
  );

create policy tasks_insert on public.tasks
  for insert to authenticated
  with check ((select public.current_user_role()) = 'manager');

create policy tasks_update on public.tasks
  for update to authenticated
  using ((select public.current_user_role()) = 'manager')
  with check ((select public.current_user_role()) = 'manager');

create policy tasks_delete on public.tasks
  for delete to authenticated
  using ((select public.current_user_role()) = 'manager');

-- task_history: read-only for clients. Rows are written only by
-- SECURITY DEFINER triggers and transition_task, so history cannot be forged,
-- edited or erased through the API.
grant select on public.task_history to authenticated;

create policy task_history_select on public.task_history
  for select to authenticated
  using (
    (select public.current_user_role()) = 'manager'
    or exists (
      select 1 from public.tasks
      where tasks.id = task_history.task_id
        and tasks.assignee_id = (select auth.uid())
    )
  );

-- RLS cannot compare old and new rows, so edit rules that depend on the
-- current status are enforced by triggers.
create function public.check_assignee_is_executor()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = new.assignee_id and role = 'executor'
  ) then
    raise exception 'assignee_must_be_executor';
  end if;
  return new;
end;
$$;

create trigger tasks_check_assignee
  before insert or update of assignee_id on public.tasks
  for each row execute function public.check_assignee_is_executor();

-- An accepted task is final: it can only be deleted. Moving a task to another
-- object or executor is allowed only before work has started.
create function public.guard_task_edit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'accepted' then
    raise exception 'task_accepted_readonly';
  end if;
  if old.status <> 'new'
     and (new.object_id, new.assignee_id) is distinct from (old.object_id, old.assignee_id) then
    raise exception 'task_fields_locked';
  end if;
  return new;
end;
$$;

create trigger tasks_guard_edit
  before update on public.tasks
  for each row execute function public.guard_task_edit();
