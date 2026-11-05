-- Tables and types only. Access rules live in the access migration,
-- status workflow and history in the workflow migration.

create type public.user_role as enum ('manager', 'executor');

create type public.task_status as enum ('new', 'in_progress', 'review', 'accepted', 'rework');

create type public.task_event as enum ('created', 'status_changed', 'deleted');

-- Role lives here and nowhere else: auth user_metadata is writable by the user
-- themselves through auth.updateUser, so it must never decide permissions.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (btrim(full_name, E' \t\n\r\f\v') <> ''),
  role public.user_role not null
);

create table public.objects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name, E' \t\n\r\f\v') <> ''),
  address text not null check (btrim(address, E' \t\n\r\f\v') <> ''),
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);

-- object_id has no ON DELETE CASCADE on purpose: a cascade deletes tasks after
-- the object row is gone, so the history snapshot could not read the object
-- name. Deleting an object's tasks is done by a trigger in the workflow migration.
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references public.objects (id),
  title text not null check (btrim(title, E' \t\n\r\f\v') <> ''),
  description text not null default '',
  assignee_id uuid not null references public.profiles (id),
  status public.task_status not null default 'new',
  author_id uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);

create index tasks_object_id_idx on public.tasks (object_id);
create index tasks_assignee_id_idx on public.tasks (assignee_id);

-- task_id has no foreign key so history outlives the task it describes;
-- title and object name are snapshots for the same reason.
create table public.task_history (
  id bigint generated always as identity primary key,
  task_id uuid not null,
  task_title text not null,
  object_name text not null,
  actor_id uuid references public.profiles (id) on delete set null,
  event public.task_event not null,
  from_status public.task_status,
  to_status public.task_status,
  comment text,
  created_at timestamptz not null default now()
);

create index task_history_task_id_idx on public.task_history (task_id);
