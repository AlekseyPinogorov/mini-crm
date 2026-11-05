-- Task status workflow and history.

-- The single source of truth for allowed status changes. transition_task
-- checks against it, and the UI reads it to decide which buttons to show.
-- Executor rows additionally require the caller to be the task's assignee.
create table public.task_status_transitions (
  from_status public.task_status not null,
  to_status public.task_status not null,
  actor_role public.user_role not null,
  comment_required boolean not null default false,
  primary key (from_status, to_status)
);

insert into public.task_status_transitions (from_status, to_status, actor_role, comment_required) values
  ('new',         'in_progress', 'executor', false),
  ('in_progress', 'review',      'executor', false),
  ('review',      'accepted',    'manager',  false),
  ('review',      'rework',      'manager',  true),
  ('rework',      'in_progress', 'executor', false);

revoke all on table public.task_status_transitions from anon, authenticated;
grant select on public.task_status_transitions to authenticated;

alter table public.task_status_transitions enable row level security;

create policy task_status_transitions_select on public.task_status_transitions
  for select to authenticated
  using ((select public.current_user_role()) is not null);

-- The only way to change a task's status: clients have no UPDATE grant on
-- tasks.status, this function runs as the table owner.
create function public.transition_task(
  p_task_id uuid,
  p_to_status public.task_status,
  p_comment text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role := public.current_user_role();
  -- btrim with the full ASCII whitespace set, not plain trim() (spaces only):
  -- a mandatory rework comment must not be satisfiable by newlines or tabs.
  v_comment text := nullif(btrim(p_comment, E' \t\n\r\f\v'), '');
  v_task public.tasks%rowtype;
  v_rule public.task_status_transitions%rowtype;
begin
  if v_role is null then
    raise exception 'not_authenticated';
  end if;

  -- Row lock: a concurrent transition of the same task waits here and then
  -- sees the already changed status, so two requests cannot both leave one status.
  select * into v_task from public.tasks where id = p_task_id for update;

  -- Same error for "missing" and "not yours": an executor must not learn
  -- that someone else's task exists.
  if not found or (v_role = 'executor' and v_task.assignee_id <> auth.uid()) then
    raise exception 'task_not_found';
  end if;

  select * into v_rule
  from public.task_status_transitions
  where from_status = v_task.status
    and to_status = p_to_status
    and actor_role = v_role;

  if not found then
    raise exception 'transition_not_allowed';
  end if;

  if v_rule.comment_required and v_comment is null then
    raise exception 'comment_required';
  end if;

  update public.tasks set status = p_to_status where id = p_task_id;

  insert into public.task_history
    (task_id, task_title, object_name, actor_id, event, from_status, to_status, comment)
  values (
    v_task.id,
    v_task.title,
    (select name from public.objects where id = v_task.object_id),
    auth.uid(),
    'status_changed',
    v_task.status,
    p_to_status,
    v_comment
  );
end;
$$;

revoke execute on function public.transition_task(uuid, public.task_status, text) from public, anon;
grant execute on function public.transition_task(uuid, public.task_status, text) to authenticated;

-- History triggers run as the owner because clients have no INSERT on
-- task_history. They are never callable directly: trigger execution does not
-- check EXECUTE, so all roles lose it.
create function public.log_task_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.task_history (task_id, task_title, object_name, actor_id, event, to_status)
  values (
    new.id,
    new.title,
    (select name from public.objects where id = new.object_id),
    new.author_id,
    'created',
    new.status
  );
  return null;
end;
$$;

create function public.log_task_deleted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.task_history (task_id, task_title, object_name, actor_id, event, from_status)
  values (
    old.id,
    old.title,
    (select name from public.objects where id = old.object_id),
    auth.uid(),
    'deleted',
    old.status
  );
  return null;
end;
$$;

revoke execute on function public.log_task_created(), public.log_task_deleted()
  from public, anon, authenticated;

create trigger tasks_log_created
  after insert on public.tasks
  for each row execute function public.log_task_created();

create trigger tasks_log_deleted
  after delete on public.tasks
  for each row execute function public.log_task_deleted();

-- Deletes an object's tasks before the object itself, while the object name
-- is still readable for the 'deleted' history snapshot. Runs with the caller's
-- rights, so the tasks delete policy (managers only) still applies.
create function public.delete_object_tasks()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  delete from public.tasks where object_id = old.id;
  return old;
end;
$$;

create trigger objects_delete_tasks
  before delete on public.objects
  for each row execute function public.delete_object_tasks();
