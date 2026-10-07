-- UNAPPLIED PREPARATION DRAFT, not a CLI migration. Local validation required.
-- No write RPCs, client DML grants, seed, bucket policies or backend integration yet.
-- Generate a CLI migration with `supabase migration new` before adopting locally.
begin;
create schema if not exists private;
revoke all on schema private from public;

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  name text not null,
  job_title text not null,
  email text,
  phone text,
  avatar_path text,
  status text not null default 'Active' check (status in ('Active','Away')),
  capacity numeric not null default 100 check(capacity>0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id,id)
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  auth_user_id uuid not null references auth.users(id) on delete restrict,
  team_member_id uuid,
  role text not null check(role in ('owner_admin','operations_manager','project_manager','designer','quantity_surveyor','site_engineer','mep_engineer','procurement','site_supervisor')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id,auth_user_id),
  unique(workspace_id,team_member_id),
  foreign key(workspace_id,team_member_id) references public.team_members(workspace_id,id) on delete restrict
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  name text not null check(length(trim(name))>0),
  contact_name text,
  contact_email text,
  contact_phone text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id,id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  client_id uuid not null,
  code text not null check(length(trim(code))>0),
  name text not null check(length(trim(name))>=2),
  project_type text not null,
  location text not null,
  emirate text not null,
  building_community text,
  floor_unit text,
  area numeric not null default 0 check(area>=0),
  scope_summary text,
  disciplines text[] not null default '{}',
  contract_value numeric not null default 0 check(contract_value>=0),
  priority text not null default 'Normal' check(priority in ('Low','Normal','High','Critical')),
  status text not null default 'Draft' check(status in ('Active','Draft','On Hold','Completed')),
  planned_start_date date not null,
  target_completion_date date not null,
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete restrict,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id,id),
  check(target_completion_date>=planned_start_date),
  foreign key(workspace_id,client_id) references public.clients(workspace_id,id) on delete restrict
);

create table public.project_phases (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  project_id uuid not null,
  foreign key (workspace_id, project_id) references public.projects(workspace_id,id) on delete restrict,
  name text not null,
  phase_key text not null,
  sort_order integer not null check(sort_order>=0),
  weight numeric not null check(weight>=0 and weight<=100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id,project_id,id),
  unique(project_id,phase_key)
);

create table public.project_assignments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  project_id uuid not null,
  foreign key (workspace_id, project_id) references public.projects(workspace_id,id) on delete restrict,
  team_member_id uuid not null,
  role text not null,
  responsibility text,
  start_date date not null,
  expected_end_date date not null,
  status text not null check(status in ('Active','Replaced','Removed')),
  replaced_assignment_id uuid,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id,project_id,id),
  check(expected_end_date>=start_date),
  foreign key(workspace_id,team_member_id) references public.team_members(workspace_id,id) on delete restrict,
  foreign key(workspace_id,project_id,replaced_assignment_id) references public.project_assignments(workspace_id,project_id,id) on delete restrict
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  project_id uuid not null,
  foreign key (workspace_id, project_id) references public.projects(workspace_id,id) on delete restrict,
  phase_id uuid not null,
  parent_task_id uuid,
  name text not null check(length(trim(name))>=2),
  description text,
  assigned_team_member_id uuid,
  start_date date not null,
  due_date date not null,
  progress numeric not null default 0 check(progress between 0 and 100),
  status text not null default 'Not Started' check(status in ('Not Started','In Progress','Waiting','Blocked','Completed')),
  priority text not null default 'Normal' check(priority in ('Low','Normal','High','Critical')),
  trade text,
  allocation numeric not null default 0 check(allocation between 0 and 100),
  notes text,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete restrict,
  completed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id,project_id,id),
  unique(workspace_id,project_id,phase_id,id),
  check(due_date>=start_date),
  check(parent_task_id is null or parent_task_id<>id),
  foreign key(workspace_id,project_id,phase_id) references public.project_phases(workspace_id,project_id,id) on delete restrict,
  foreign key(workspace_id,project_id,phase_id,parent_task_id) references public.tasks(workspace_id,project_id,phase_id,id) on delete restrict,
  foreign key(workspace_id,assigned_team_member_id) references public.team_members(workspace_id,id) on delete restrict
);

create table public.task_dependencies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  project_id uuid not null,
  foreign key (workspace_id, project_id) references public.projects(workspace_id,id) on delete restrict,
  predecessor_task_id uuid not null,
  successor_task_id uuid not null,
  dependency_type text not null default 'finish_to_start' check(dependency_type='finish_to_start'),
  created_at timestamptz not null default now(),
  check(predecessor_task_id<>successor_task_id),
  unique(predecessor_task_id,successor_task_id),
  foreign key(workspace_id,project_id,predecessor_task_id) references public.tasks(workspace_id,project_id,id) on delete restrict,
  foreign key(workspace_id,project_id,successor_task_id) references public.tasks(workspace_id,project_id,id) on delete restrict
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  project_id uuid not null,
  foreign key (workspace_id, project_id) references public.projects(workspace_id,id) on delete restrict,
  linked_task_id uuid,
  name text not null,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(linked_task_id is not null or due_date is not null),
  check(linked_task_id is null or due_date is null),
  foreign key(workspace_id,project_id,linked_task_id) references public.tasks(workspace_id,project_id,id) on delete restrict
);

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  project_id uuid not null,
  foreign key (workspace_id, project_id) references public.projects(workspace_id,id) on delete restrict,
  task_id uuid not null,
  body text not null check(length(trim(body))>0),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(workspace_id,project_id,task_id) references public.tasks(workspace_id,project_id,id) on delete restrict
);

create table public.site_updates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  project_id uuid not null,
  foreign key (workspace_id, project_id) references public.projects(workspace_id,id) on delete restrict,
  update_date date not null,
  work_completed text not null check(length(trim(work_completed))>0),
  work_in_progress text,
  delay_issue text,
  tomorrow_plan text,
  manpower_count integer not null default 0 check(manpower_count>=0),
  notes text,
  created_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id,project_id,id)
);

create table public.snags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  project_id uuid not null,
  foreign key (workspace_id, project_id) references public.projects(workspace_id,id) on delete restrict,
  reference text not null,
  area_room text not null,
  description text not null,
  responsible_team_member_id uuid,
  priority text not null default 'Normal' check(priority in ('Low','Normal','High','Critical')),
  status text not null default 'Open' check(status in ('Open','Assigned','Rectification','Ready for Inspection','Closed')),
  target_date date not null,
  inspection_notes text,
  created_by uuid references auth.users(id) on delete restrict,
  closed_by uuid references auth.users(id) on delete restrict,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id,project_id,id),
  unique(project_id,reference),
  check(status<>'Closed' or (coalesce(length(trim(inspection_notes)),0)>0 and closed_at is not null and closed_by is not null)),
  foreign key(workspace_id,responsible_team_member_id) references public.team_members(workspace_id,id) on delete restrict
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  project_id uuid not null,
  foreign key (workspace_id, project_id) references public.projects(workspace_id,id) on delete restrict,
  category text not null,
  name text not null,
  storage_path text unique,
  mime_type text,
  size_bytes bigint check(size_bytes>=0),
  version integer not null default 1 check(version>=1),
  status text not null default 'Pending' check(status in ('Pending','Approved')),
  uploaded_by uuid references auth.users(id) on delete restrict,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.handover_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  project_id uuid not null,
  foreign key (workspace_id, project_id) references public.projects(workspace_id,id) on delete restrict,
  category text not null,
  label text not null,
  required boolean not null default true,
  applicable boolean not null default true,
  completion_mode text not null default 'manual' check(completion_mode in ('manual','tasks','snags')),
  completed boolean,
  completed_by uuid references auth.users(id) on delete restrict,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check((completion_mode='manual' and completed is not null) or (completion_mode<>'manual' and completed is null and completed_by is null and completed_at is null))
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  project_id uuid not null,
  foreign key (workspace_id, project_id) references public.projects(workspace_id,id) on delete restrict,
  actor_auth_user_id uuid references auth.users(id) on delete restrict,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  summary text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.site_update_photos (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  project_id uuid not null,
  foreign key (workspace_id, project_id) references public.projects(workspace_id,id) on delete restrict,
  site_update_id uuid not null,
  storage_path text not null unique,
  display_name text not null,
  category text not null check(category in ('Before','Progress','Completed','Issue','Inspection')),
  mime_type text not null,
  size_bytes bigint not null check(size_bytes>=0),
  uploaded_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key(workspace_id,project_id,site_update_id) references public.site_updates(workspace_id,project_id,id) on delete restrict
);

create table public.snag_media (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  project_id uuid not null,
  foreign key (workspace_id, project_id) references public.projects(workspace_id,id) on delete restrict,
  snag_id uuid not null,
  storage_path text not null unique,
  display_name text not null,
  category text not null check(category in ('Before','After')),
  mime_type text not null,
  size_bytes bigint not null check(size_bytes>=0),
  uploaded_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key(workspace_id,project_id,snag_id) references public.snags(workspace_id,project_id,id) on delete restrict
);

create table public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  project_id uuid not null,
  foreign key (workspace_id, project_id) references public.projects(workspace_id,id) on delete restrict,
  task_id uuid not null,
  storage_path text not null unique,
  display_name text not null,
  category text not null,
  mime_type text not null,
  size_bytes bigint not null check(size_bytes>=0),
  uploaded_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key(workspace_id,project_id,task_id) references public.tasks(workspace_id,project_id,id) on delete restrict
);

create unique index projects_workspace_code_ci on public.projects(workspace_id,lower(code));
create unique index one_active_project_manager on public.project_assignments(project_id) where role='Project Manager' and status='Active';
create index members_user_workspace_active on public.workspace_members(auth_user_id,workspace_id) where is_active;
create index assignments_person_project_active on public.project_assignments(team_member_id,project_id) where status='Active';
create index tasks_assignee_due on public.tasks(workspace_id,assigned_team_member_id,due_date) where archived_at is null;
create index dependencies_successor on public.task_dependencies(successor_task_id);
create index phases_project_order on public.project_phases(project_id,sort_order);
create index site_updates_project_date on public.site_updates(project_id,update_date desc);
create index activities_project_date on public.activities(project_id,created_at desc);
create index snags_project_status on public.snags(project_id,status);
create index documents_project_category on public.documents(project_id,category);

-- Minimal privileged lookups avoid recursive membership/assignment RLS.
-- Each lookup evaluates auth.uid(), never a browser-supplied actor.
create function private.is_workspace_member(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists(select 1 from public.workspace_members m
    where m.workspace_id=target and m.auth_user_id=auth.uid() and m.is_active);
$$;
create function private.has_workspace_role(target uuid, allowed text[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists(select 1 from public.workspace_members m
    where m.workspace_id=target and m.auth_user_id=auth.uid() and m.is_active and m.role=any(allowed));
$$;
create function private.can_access_project(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists(
    select 1 from public.projects p join public.workspace_members m on m.workspace_id=p.workspace_id
    where p.id=target and p.archived_at is null and m.auth_user_id=auth.uid() and m.is_active
    and (m.role in ('owner_admin','operations_manager') or exists(
      select 1 from public.project_assignments a where a.project_id=p.id
      and a.workspace_id=p.workspace_id and a.team_member_id=m.team_member_id and a.status='Active')));
$$;
revoke all on function private.is_workspace_member(uuid) from public,anon,authenticated;
revoke all on function private.has_workspace_role(uuid,text[]) from public,anon,authenticated;
revoke all on function private.can_access_project(uuid) from public,anon,authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_workspace_member(uuid) to authenticated;
grant execute on function private.has_workspace_role(uuid,text[]) to authenticated;
grant execute on function private.can_access_project(uuid) to authenticated;

alter table public.workspaces enable row level security;
revoke all on public.workspaces from public,anon,authenticated;
grant select on public.workspaces to authenticated;
create policy workspaces_authorized_read on public.workspaces for select to authenticated using (private.is_workspace_member(id));

alter table public.team_members enable row level security;
revoke all on public.team_members from public,anon,authenticated;
grant select on public.team_members to authenticated;
create policy team_members_authorized_read on public.team_members for select to authenticated using (private.is_workspace_member(workspace_id));

alter table public.workspace_members enable row level security;
revoke all on public.workspace_members from public,anon,authenticated;
grant select on public.workspace_members to authenticated;
create policy workspace_members_authorized_read on public.workspace_members for select to authenticated using (is_active and auth_user_id=(select auth.uid()));

alter table public.clients enable row level security;
revoke all on public.clients from public,anon,authenticated;
grant select on public.clients to authenticated;
create policy clients_authorized_read on public.clients for select to authenticated using (private.has_workspace_role(workspace_id,array['owner_admin','operations_manager']) or exists(select 1 from public.projects p where p.workspace_id=clients.workspace_id and p.client_id=clients.id and private.can_access_project(p.id)));

alter table public.projects enable row level security;
revoke all on public.projects from public,anon,authenticated;
grant select on public.projects to authenticated;
create policy projects_authorized_read on public.projects for select to authenticated using (private.can_access_project(id));

alter table public.project_phases enable row level security;
revoke all on public.project_phases from public,anon,authenticated;
grant select on public.project_phases to authenticated;
create policy project_phases_authorized_read on public.project_phases for select to authenticated using (private.is_workspace_member(workspace_id) and private.can_access_project(project_id));

alter table public.project_assignments enable row level security;
revoke all on public.project_assignments from public,anon,authenticated;
grant select on public.project_assignments to authenticated;
create policy project_assignments_authorized_read on public.project_assignments for select to authenticated using (private.is_workspace_member(workspace_id) and private.can_access_project(project_id));

alter table public.tasks enable row level security;
revoke all on public.tasks from public,anon,authenticated;
grant select on public.tasks to authenticated;
create policy tasks_authorized_read on public.tasks for select to authenticated using (private.is_workspace_member(workspace_id) and private.can_access_project(project_id));

alter table public.task_dependencies enable row level security;
revoke all on public.task_dependencies from public,anon,authenticated;
grant select on public.task_dependencies to authenticated;
create policy task_dependencies_authorized_read on public.task_dependencies for select to authenticated using (private.is_workspace_member(workspace_id) and private.can_access_project(project_id));

alter table public.milestones enable row level security;
revoke all on public.milestones from public,anon,authenticated;
grant select on public.milestones to authenticated;
create policy milestones_authorized_read on public.milestones for select to authenticated using (private.is_workspace_member(workspace_id) and private.can_access_project(project_id));

alter table public.task_comments enable row level security;
revoke all on public.task_comments from public,anon,authenticated;
grant select on public.task_comments to authenticated;
create policy task_comments_authorized_read on public.task_comments for select to authenticated using (private.is_workspace_member(workspace_id) and private.can_access_project(project_id));

alter table public.site_updates enable row level security;
revoke all on public.site_updates from public,anon,authenticated;
grant select on public.site_updates to authenticated;
create policy site_updates_authorized_read on public.site_updates for select to authenticated using (private.is_workspace_member(workspace_id) and private.can_access_project(project_id));

alter table public.snags enable row level security;
revoke all on public.snags from public,anon,authenticated;
grant select on public.snags to authenticated;
create policy snags_authorized_read on public.snags for select to authenticated using (private.is_workspace_member(workspace_id) and private.can_access_project(project_id));

alter table public.documents enable row level security;
revoke all on public.documents from public,anon,authenticated;
grant select on public.documents to authenticated;
create policy documents_authorized_read on public.documents for select to authenticated using (private.is_workspace_member(workspace_id) and private.can_access_project(project_id));

alter table public.handover_items enable row level security;
revoke all on public.handover_items from public,anon,authenticated;
grant select on public.handover_items to authenticated;
create policy handover_items_authorized_read on public.handover_items for select to authenticated using (private.is_workspace_member(workspace_id) and private.can_access_project(project_id));

alter table public.activities enable row level security;
revoke all on public.activities from public,anon,authenticated;
grant select on public.activities to authenticated;
create policy activities_authorized_read on public.activities for select to authenticated using (private.is_workspace_member(workspace_id) and private.can_access_project(project_id));

alter table public.site_update_photos enable row level security;
revoke all on public.site_update_photos from public,anon,authenticated;
grant select on public.site_update_photos to authenticated;
create policy site_update_photos_authorized_read on public.site_update_photos for select to authenticated using (private.is_workspace_member(workspace_id) and private.can_access_project(project_id));

alter table public.snag_media enable row level security;
revoke all on public.snag_media from public,anon,authenticated;
grant select on public.snag_media to authenticated;
create policy snag_media_authorized_read on public.snag_media for select to authenticated using (private.is_workspace_member(workspace_id) and private.can_access_project(project_id));

alter table public.task_attachments enable row level security;
revoke all on public.task_attachments from public,anon,authenticated;
grant select on public.task_attachments to authenticated;
create policy task_attachments_authorized_read on public.task_attachments for select to authenticated using (private.is_workspace_member(workspace_id) and private.can_access_project(project_id));

-- Intentional deny-by-default writes. Transaction/RPC layer pending local validation.
commit;
