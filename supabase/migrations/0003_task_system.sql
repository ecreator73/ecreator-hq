-- ===========================================================================
-- eCreator OS - Phase 3: Task-System (Herzstueck)
-- ---------------------------------------------------------------------------
-- Zentrales Operations-System. Tabellen:
--   tasks, task_comments, task_files, task_assignees, subtasks, task_activity,
--   task_templates, task_template_items, notifications
-- Status/Prioritaet via FK in die zentrale Registry (statuses/priorities, 0002).
-- Nutzt Helfer aus 0001/0002: stamp_actor, set_updated_at, is_super_admin,
-- has_role, can_manage. Ausfuehren NACH 0002.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Registry erweitern: Task-Status + Prioritaeten-Label
-- ---------------------------------------------------------------------------
insert into public.statuses (entity_type, key, label, color, sort_order, is_default) values
  ('task', 'open',           'Offen',             'gray',  1, true),
  ('task', 'in_progress',    'In Arbeit',         'blue',  2, false),
  ('task', 'waiting_client', 'Wartet auf Kunde',  'amber', 3, false),
  ('task', 'review',         'Intern Review',     'blue',  4, false),
  ('task', 'blocked',        'Blockiert',         'red',   5, false),
  ('task', 'done',           'Erledigt',          'green', 6, false),
  ('task', 'archived',       'Archiviert',        'gray',  7, false)
on conflict (entity_type, key) do nothing;

-- Prompt 3: oberste Prioritaet heisst "Kritisch" (Key bleibt 'urgent').
update public.priorities set label = 'Kritisch' where key = 'urgent';

-- ---------------------------------------------------------------------------
-- 2. tasks
-- ---------------------------------------------------------------------------
create table if not exists public.tasks (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null default '11111111-1111-1111-1111-111111111111'
                    references public.organizations (id),
  title           text not null,
  description     text,
  client_id       uuid references public.clients (id) on delete set null,
  project_id      uuid references public.projects (id) on delete set null,
  assigned_to     uuid references public.profiles (id) on delete set null,
  created_by      uuid references public.profiles (id),
  updated_by      uuid references public.profiles (id),
  status_id       uuid not null references public.statuses (id),
  priority_id     uuid references public.priorities (id),
  due_date        date,
  start_date      date,
  completed_at    timestamptz,
  estimated_hours numeric(6, 2),
  actual_hours    numeric(6, 2),
  tags            text[] not null default '{}',
  position        double precision not null default 0,
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists tasks_status_idx on public.tasks (status_id);
create index if not exists tasks_priority_idx on public.tasks (priority_id);
create index if not exists tasks_assigned_idx on public.tasks (assigned_to);
create index if not exists tasks_client_idx on public.tasks (client_id);
create index if not exists tasks_project_idx on public.tasks (project_id);
create index if not exists tasks_due_idx on public.tasks (due_date);
create index if not exists tasks_created_by_idx on public.tasks (created_by);
create index if not exists tasks_board_idx on public.tasks (status_id, position);
create index if not exists tasks_active_idx on public.tasks (deleted_at) where deleted_at is null;

-- ---------------------------------------------------------------------------
-- 3. subtasks (Checkliste)
-- ---------------------------------------------------------------------------
create table if not exists public.subtasks (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks (id) on delete cascade,
  title       text not null,
  completed   boolean not null default false,
  order_index integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists subtasks_task_idx on public.subtasks (task_id, order_index);

-- ---------------------------------------------------------------------------
-- 4. task_comments
-- ---------------------------------------------------------------------------
create table if not exists public.task_comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks (id) on delete cascade,
  user_id    uuid references public.profiles (id) on delete set null,
  comment    text not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists task_comments_task_idx on public.task_comments (task_id, created_at);

-- ---------------------------------------------------------------------------
-- 5. task_files (Verknuepfung zu files aus 0002)
-- ---------------------------------------------------------------------------
create table if not exists public.task_files (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks (id) on delete cascade,
  file_id    uuid not null references public.files (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (task_id, file_id)
);
create index if not exists task_files_task_idx on public.task_files (task_id);

-- ---------------------------------------------------------------------------
-- 6. task_assignees (mehrere Verantwortliche)
-- ---------------------------------------------------------------------------
create table if not exists public.task_assignees (
  task_id    uuid not null references public.tasks (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, user_id)
);
create index if not exists task_assignees_user_idx on public.task_assignees (user_id);

-- ---------------------------------------------------------------------------
-- 7. task_activity (task-spezifische Historie, im Detail-Tab "Aktivitaet")
-- ---------------------------------------------------------------------------
create table if not exists public.task_activity (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks (id) on delete cascade,
  user_id    uuid references public.profiles (id) on delete set null,
  action     text not null,
  old_value  text,
  new_value  text,
  created_at timestamptz not null default now()
);
create index if not exists task_activity_task_idx on public.task_activity (task_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 8. task_templates + items (Vorbereitung automatische Aufgaben)
-- ---------------------------------------------------------------------------
create table if not exists public.task_templates (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null default '11111111-1111-1111-1111-111111111111'
                 references public.organizations (id),
  name         text not null,
  description  text,
  project_type text,
  is_active    boolean not null default true,
  created_by   uuid references public.profiles (id),
  created_at   timestamptz not null default now()
);

create table if not exists public.task_template_items (
  id               uuid primary key default gen_random_uuid(),
  template_id      uuid not null references public.task_templates (id) on delete cascade,
  title            text not null,
  description      text,
  order_index      integer not null default 0,
  priority_key     text,
  due_offset_days  integer,
  created_at       timestamptz not null default now()
);
create index if not exists task_template_items_tpl_idx on public.task_template_items (template_id, order_index);

-- ---------------------------------------------------------------------------
-- 9. notifications (nur Infrastruktur - kein Versand in dieser Phase)
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default '11111111-1111-1111-1111-111111111111'
                references public.organizations (id),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text,
  entity_type text,
  entity_id   uuid,
  is_read     boolean not null default false,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, is_read, created_at desc);

-- ===========================================================================
-- 10. Trigger
-- ===========================================================================
-- updated_at
do $$
declare t text;
begin
  foreach t in array array['tasks','subtasks','task_comments']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
  end loop;
end;
$$;

-- created_by/updated_by-Stempel beim INSERT (verhindert Spoofing)
drop trigger if exists stamp_actor on public.tasks;
create trigger stamp_actor before insert on public.tasks
  for each row execute function public.stamp_actor();

-- Default-Status/Prioritaet setzen + completed_at pflegen
create or replace function public.set_task_defaults()
returns trigger
language plpgsql
as $$
declare
  done_id uuid;
begin
  if new.status_id is null then
    select id into new.status_id
    from public.statuses
    where entity_type = 'task' and is_default
    order by sort_order
    limit 1;
  end if;
  if new.priority_id is null then
    select id into new.priority_id
    from public.priorities where is_default order by sort_order limit 1;
  end if;

  select id into done_id
  from public.statuses where entity_type = 'task' and key = 'done' limit 1;

  -- completed_at NUR bei tatsaechlichem Statuswechsel (oder INSERT) anfassen,
  -- damit manuelle Werte bei unveraendertem Status erhalten bleiben.
  if tg_op = 'INSERT' then
    if new.status_id = done_id and new.completed_at is null then
      new.completed_at := now();
    end if;
  elsif new.status_id is distinct from old.status_id then
    if new.status_id = done_id then
      new.completed_at := coalesce(new.completed_at, now());
    else
      new.completed_at := null;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists set_task_defaults on public.tasks;
create trigger set_task_defaults before insert or update on public.tasks
  for each row execute function public.set_task_defaults();

-- created_by unveraenderlich halten + updated_by bei jedem UPDATE stempeln.
create or replace function public.tasks_stamp_update()
returns trigger
language plpgsql
as $$
begin
  new.created_by := old.created_by;
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists tasks_stamp_update on public.tasks;
create trigger tasks_stamp_update before update on public.tasks
  for each row execute function public.tasks_stamp_update();

-- Zuweisungs-Benachrichtigung serverseitig erzeugen (SECURITY DEFINER -> kann
-- fuer den Ziel-Nutzer schreiben; verhindert Client-seitiges Notification-Spoofing).
create or replace function public.notify_task_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assigned_to is not null
     and (tg_op = 'INSERT' or new.assigned_to is distinct from old.assigned_to)
     and new.assigned_to <> auth.uid() then
    insert into public.notifications (user_id, type, title, body, entity_type, entity_id)
    values (new.assigned_to, 'assigned', 'Aufgabe zugewiesen', new.title, 'task', new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists notify_task_assignment on public.tasks;
create trigger notify_task_assignment
  after insert or update of assigned_to on public.tasks
  for each row execute function public.notify_task_assignment();

-- ===========================================================================
-- 11. Row Level Security
-- ===========================================================================
alter table public.tasks               enable row level security;
alter table public.subtasks            enable row level security;
alter table public.task_comments       enable row level security;
alter table public.task_files          enable row level security;
alter table public.task_assignees      enable row level security;
alter table public.task_activity       enable row level security;
alter table public.task_templates      enable row level security;
alter table public.task_template_items enable row level security;
alter table public.notifications       enable row level security;

-- tasks: alle eingeloggten sehen nicht-geloeschte; Owner/Assignee + breite Rollen aendern
drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select" on public.tasks for select to authenticated
  using (deleted_at is null or public.is_super_admin());
drop policy if exists "tasks_insert" on public.tasks;
create policy "tasks_insert" on public.tasks for insert to authenticated
  with check (true);
drop policy if exists "tasks_update" on public.tasks;
create policy "tasks_update" on public.tasks for update to authenticated
  using (
    public.can_manage(created_by)
    or assigned_to = auth.uid()
    or created_by = auth.uid()
  )
  with check (
    public.can_manage(created_by)
    or assigned_to = auth.uid()
    or created_by = auth.uid()
  );
drop policy if exists "tasks_delete" on public.tasks;
create policy "tasks_delete" on public.tasks for delete to authenticated
  using (public.is_super_admin());

-- Helfer: ist die Eltern-Task fuer den Nutzer sichtbar?
create or replace function public.task_visible(t_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tasks t
    where t.id = t_id and (t.deleted_at is null or public.is_super_admin())
  );
$$;

-- Kind-Tabellen: Sichtbarkeit folgt der Task; Schreiben durch Eingeloggte
do $$
declare t text;
begin
  foreach t in array array['subtasks','task_files','task_activity']
  loop
    execute format('drop policy if exists "%s_select" on public.%I', t, t);
    execute format(
      'create policy "%s_select" on public.%I for select to authenticated
         using (public.task_visible(task_id))', t, t);
    execute format('drop policy if exists "%s_write" on public.%I', t, t);
    execute format(
      'create policy "%s_write" on public.%I for all to authenticated
         using (public.task_visible(task_id)) with check (public.task_visible(task_id))', t, t);
  end loop;
end;
$$;

-- task_assignees: enger - normale Nutzer duerfen nur sich selbst zuweisen,
-- breite Rollen (Owner/Manager) beliebige Personen.
drop policy if exists "task_assignees_select" on public.task_assignees;
create policy "task_assignees_select" on public.task_assignees for select to authenticated
  using (public.task_visible(task_id));
drop policy if exists "task_assignees_write" on public.task_assignees;
create policy "task_assignees_write" on public.task_assignees for all to authenticated
  using (
    public.task_visible(task_id)
    and (
      user_id = auth.uid()
      or public.is_super_admin()
      or public.has_role('ceo')
      or public.has_role('cso')
      or public.has_role('project_manager')
    )
  )
  with check (
    public.task_visible(task_id)
    and (
      user_id = auth.uid()
      or public.is_super_admin()
      or public.has_role('ceo')
      or public.has_role('cso')
      or public.has_role('project_manager')
    )
  );

-- task_comments: sichtbar wenn Task sichtbar; bearbeiten/loeschen nur eigener Kommentar
drop policy if exists "task_comments_select" on public.task_comments;
create policy "task_comments_select" on public.task_comments for select to authenticated
  using (public.task_visible(task_id));
drop policy if exists "task_comments_insert" on public.task_comments;
create policy "task_comments_insert" on public.task_comments for insert to authenticated
  with check (public.task_visible(task_id) and user_id = auth.uid());
drop policy if exists "task_comments_update" on public.task_comments;
create policy "task_comments_update" on public.task_comments for update to authenticated
  using (user_id = auth.uid() or public.is_super_admin())
  with check (user_id = auth.uid() or public.is_super_admin());
drop policy if exists "task_comments_delete" on public.task_comments;
create policy "task_comments_delete" on public.task_comments for delete to authenticated
  using (user_id = auth.uid() or public.is_super_admin());

-- task_templates / items: lesbar fuer alle, verwalten durch breite Rollen
drop policy if exists "task_templates_select" on public.task_templates;
create policy "task_templates_select" on public.task_templates for select to authenticated
  using (true);
drop policy if exists "task_templates_manage" on public.task_templates;
create policy "task_templates_manage" on public.task_templates for all to authenticated
  using (public.is_super_admin() or public.has_role('ceo') or public.has_role('cso') or public.has_role('project_manager'))
  with check (public.is_super_admin() or public.has_role('ceo') or public.has_role('cso') or public.has_role('project_manager'));
drop policy if exists "task_template_items_select" on public.task_template_items;
create policy "task_template_items_select" on public.task_template_items for select to authenticated
  using (true);
drop policy if exists "task_template_items_manage" on public.task_template_items;
create policy "task_template_items_manage" on public.task_template_items for all to authenticated
  using (public.is_super_admin() or public.has_role('ceo') or public.has_role('cso') or public.has_role('project_manager'))
  with check (public.is_super_admin() or public.has_role('ceo') or public.has_role('cso') or public.has_role('project_manager'));

-- notifications: jeder sieht/aendert nur die eigenen
drop policy if exists "notifications_select" on public.notifications;
create policy "notifications_select" on public.notifications for select to authenticated
  using (user_id = auth.uid());
-- Direkte Client-Inserts nur fuer eigene Notifications; Zuweisungs-
-- benachrichtigungen erzeugt der SECURITY-DEFINER-Trigger notify_task_assignment.
drop policy if exists "notifications_insert" on public.notifications;
create policy "notifications_insert" on public.notifications for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists "notifications_update" on public.notifications;
create policy "notifications_update" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "notifications_delete" on public.notifications;
create policy "notifications_delete" on public.notifications for delete to authenticated
  using (user_id = auth.uid());

-- ===========================================================================
-- 12. Seed: Task-Templates (Struktur-Seed, keine Geschaeftsdaten)
-- ===========================================================================
insert into public.task_templates (id, name, description, project_type) values
  ('22222222-0000-0000-0000-000000000001', 'Website Projekt', 'Standard-Ablauf fuer Website-Projekte', 'website'),
  ('22222222-0000-0000-0000-000000000002', 'CRM Projekt',     'Standard-Ablauf fuer CRM-Projekte',     'crm')
on conflict (id) do nothing;

insert into public.task_template_items (template_id, title, order_index, priority_key) values
  ('22222222-0000-0000-0000-000000000001', 'Sitemap erstellen', 1, 'high'),
  ('22222222-0000-0000-0000-000000000001', 'Design erstellen',  2, 'high'),
  ('22222222-0000-0000-0000-000000000001', 'Entwicklung',       3, 'high'),
  ('22222222-0000-0000-0000-000000000001', 'SEO',               4, 'medium'),
  ('22222222-0000-0000-0000-000000000001', 'Tracking',          5, 'medium'),
  ('22222222-0000-0000-0000-000000000001', 'Launch',            6, 'urgent'),
  ('22222222-0000-0000-0000-000000000002', 'Anforderungen',     1, 'high'),
  ('22222222-0000-0000-0000-000000000002', 'Workflow Mapping',  2, 'high'),
  ('22222222-0000-0000-0000-000000000002', 'Datenmodell',       3, 'high'),
  ('22222222-0000-0000-0000-000000000002', 'Entwicklung',       4, 'high'),
  ('22222222-0000-0000-0000-000000000002', 'Testing',           5, 'medium'),
  ('22222222-0000-0000-0000-000000000002', 'Schulung',          6, 'medium')
on conflict do nothing;
