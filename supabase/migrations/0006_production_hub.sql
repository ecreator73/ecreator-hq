-- ===========================================================================
-- eCreator OS - Phase 6: Production Hub
-- ---------------------------------------------------------------------------
-- Operatives Liefer-Modul: Website-, Ads-, CRM-, Content-Projekte, Shootings,
-- Assets, Freigaben (approvals) und Meilensteine (project_milestones).
-- Jede spezialisierte Projektart hat einen eigenen Status-Satz in der zentralen
-- Registry (keine hardcodierten Statuswerte). Ausfuehren NACH 0005.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Registry: Status-Saetze je Produktions-Entitaet
-- ---------------------------------------------------------------------------
insert into public.statuses (entity_type, key, label, color, sort_order, is_default) values
  -- Website
  ('website_project', 'strategy',    'Strategie',     'gray',  1, true),
  ('website_project', 'sitemap',     'Sitemap',       'gray',  2, false),
  ('website_project', 'design',      'Design',        'blue',  3, false),
  ('website_project', 'development',  'Entwicklung',   'blue',  4, false),
  ('website_project', 'content',     'Content',       'blue',  5, false),
  ('website_project', 'seo',         'SEO',           'amber', 6, false),
  ('website_project', 'tracking',    'Tracking',      'amber', 7, false),
  ('website_project', 'review',      'Review',        'amber', 8, false),
  ('website_project', 'launch',      'Launch',        'green', 9, false),
  ('website_project', 'maintenance', 'Wartung',       'blue', 10, false),
  ('website_project', 'completed',   'Abgeschlossen', 'green',11, false),
  -- Ads
  ('ad_project', 'setup',         'Setup',              'gray',  1, true),
  ('ad_project', 'tracking',      'Tracking',           'gray',  2, false),
  ('ad_project', 'creative',      'Creative Produktion','blue',  3, false),
  ('ad_project', 'review',        'Review',             'amber', 4, false),
  ('ad_project', 'live',          'Live',               'green', 5, false),
  ('ad_project', 'optimization',  'Optimierung',        'blue',  6, false),
  ('ad_project', 'scaling',       'Skalierung',         'green', 7, false),
  ('ad_project', 'paused',        'Pausiert',           'amber', 8, false),
  -- CRM
  ('crm_project', 'analysis',         'Analyse',         'gray',  1, true),
  ('crm_project', 'workflow_mapping', 'Workflow Mapping','gray',  2, false),
  ('crm_project', 'data_model',       'Datenmodell',     'blue',  3, false),
  ('crm_project', 'ui_build',         'UI Aufbau',       'blue',  4, false),
  ('crm_project', 'automations',      'Automationen',    'blue',  5, false),
  ('crm_project', 'integrations',     'Integrationen',   'blue',  6, false),
  ('crm_project', 'testing',          'Testing',         'amber', 7, false),
  ('crm_project', 'training',         'Schulung',        'amber', 8, false),
  ('crm_project', 'live',             'Live',            'green', 9, false),
  ('crm_project', 'maintenance',      'Wartung',         'blue', 10, false),
  -- Content
  ('content_project', 'idea',          'Idee',           'gray',  1, true),
  ('content_project', 'planning',      'Planung',        'gray',  2, false),
  ('content_project', 'script',        'Skript',         'blue',  3, false),
  ('content_project', 'shoot_planned', 'Dreh geplant',   'blue',  4, false),
  ('content_project', 'filmed',        'Gefilmt',        'blue',  5, false),
  ('content_project', 'editing',       'Schnitt',        'amber', 6, false),
  ('content_project', 'review',        'Review',         'amber', 7, false),
  ('content_project', 'approved',      'Freigegeben',    'green', 8, false),
  ('content_project', 'published',     'Veroeffentlicht','green', 9, false),
  -- Shootings
  ('shoot', 'planned',     'Geplant',       'gray',  1, true),
  ('shoot', 'confirmed',   'Bestaetigt',    'blue',  2, false),
  ('shoot', 'done',        'Durchgefuehrt', 'green', 3, false),
  ('shoot', 'rescheduled', 'Verschoben',    'amber', 4, false),
  ('shoot', 'cancelled',   'Abgesagt',      'red',   5, false),
  -- Freigaben
  ('approval', 'open',     'Offen',       'amber', 1, true),
  ('approval', 'approved', 'Freigegeben', 'green', 2, false),
  ('approval', 'rejected', 'Abgelehnt',   'red',   3, false)
on conflict (entity_type, key) do nothing;

-- ===========================================================================
-- 2. Tabellen
-- ===========================================================================
-- Gemeinsame Spalten der spezialisierten Projektarten:
--   org_id, client_id, project_id (Basisprojekt), owner_id, status,
--   created_by/updated_by, deleted_at, created_at/updated_at.

create table if not exists public.website_projects (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null default '11111111-1111-1111-1111-111111111111'
                    references public.organizations (id),
  client_id       uuid references public.clients (id) on delete set null,
  project_id      uuid references public.projects (id) on delete set null,
  title           text,
  domain          text,
  cms             text,
  hosting         text,
  seo_status      text,
  tracking_status text,
  launch_date     date,
  owner_id        uuid references public.profiles (id) on delete set null,
  status          text not null default 'strategy',
  created_by      uuid references public.profiles (id),
  updated_by      uuid references public.profiles (id),
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists website_projects_client_idx on public.website_projects (client_id);
create index if not exists website_projects_owner_idx  on public.website_projects (owner_id);
create index if not exists website_projects_status_idx on public.website_projects (status);
create index if not exists website_projects_launch_idx on public.website_projects (launch_date);

create table if not exists public.ad_projects (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default '11111111-1111-1111-1111-111111111111'
                references public.organizations (id),
  client_id   uuid references public.clients (id) on delete set null,
  project_id  uuid references public.projects (id) on delete set null,
  title       text,
  platform    text,
  budget      bigint,           -- monatliches Budget in Rappen
  objective   text,
  owner_id    uuid references public.profiles (id) on delete set null,
  status      text not null default 'setup',
  created_by  uuid references public.profiles (id),
  updated_by  uuid references public.profiles (id),
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists ad_projects_client_idx on public.ad_projects (client_id);
create index if not exists ad_projects_owner_idx  on public.ad_projects (owner_id);
create index if not exists ad_projects_status_idx on public.ad_projects (status);

create table if not exists public.crm_projects (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null default '11111111-1111-1111-1111-111111111111'
                  references public.organizations (id),
  client_id     uuid references public.clients (id) on delete set null,
  project_id    uuid references public.projects (id) on delete set null,
  title         text,
  crm_type      text,
  go_live_date  date,
  owner_id      uuid references public.profiles (id) on delete set null,
  status        text not null default 'analysis',
  created_by    uuid references public.profiles (id),
  updated_by    uuid references public.profiles (id),
  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists crm_projects_client_idx  on public.crm_projects (client_id);
create index if not exists crm_projects_owner_idx   on public.crm_projects (owner_id);
create index if not exists crm_projects_status_idx  on public.crm_projects (status);
create index if not exists crm_projects_golive_idx  on public.crm_projects (go_live_date);

create table if not exists public.content_projects (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null default '11111111-1111-1111-1111-111111111111'
                  references public.organizations (id),
  client_id     uuid references public.clients (id) on delete set null,
  project_id    uuid references public.projects (id) on delete set null,
  title         text,
  content_type  text,
  platform      text,
  owner_id      uuid references public.profiles (id) on delete set null,
  status        text not null default 'idea',
  created_by    uuid references public.profiles (id),
  updated_by    uuid references public.profiles (id),
  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists content_projects_client_idx on public.content_projects (client_id);
create index if not exists content_projects_owner_idx  on public.content_projects (owner_id);
create index if not exists content_projects_status_idx on public.content_projects (status);

create table if not exists public.shoots (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null default '11111111-1111-1111-1111-111111111111'
                        references public.organizations (id),
  client_id           uuid references public.clients (id) on delete set null,
  content_project_id  uuid references public.content_projects (id) on delete set null,
  title               text not null,
  shooting_date       timestamptz,
  location            text,
  videographer        text,
  status              text not null default 'planned',
  notes               text,
  created_by          uuid references public.profiles (id),
  updated_by          uuid references public.profiles (id),
  deleted_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists shoots_client_idx on public.shoots (client_id);
create index if not exists shoots_date_idx   on public.shoots (shooting_date);
create index if not exists shoots_status_idx on public.shoots (status);

create table if not exists public.assets (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default '11111111-1111-1111-1111-111111111111'
                references public.organizations (id),
  client_id   uuid references public.clients (id) on delete set null,
  project_id  uuid references public.projects (id) on delete set null,
  title       text,
  category    text,
  file_url    text,
  tags        text[] not null default '{}',
  uploaded_by uuid references public.profiles (id),
  updated_by  uuid references public.profiles (id),
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists assets_client_idx   on public.assets (client_id);
create index if not exists assets_project_idx  on public.assets (project_id);
create index if not exists assets_category_idx on public.assets (category);

create table if not exists public.approvals (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null default '11111111-1111-1111-1111-111111111111'
                 references public.organizations (id),
  client_id    uuid references public.clients (id) on delete set null,
  project_id   uuid references public.projects (id) on delete set null,
  asset_id     uuid references public.assets (id) on delete set null,
  title        text,
  status       text not null default 'open',
  notes        text,
  requested_at timestamptz not null default now(),
  approved_at  timestamptz,
  created_by   uuid references public.profiles (id),
  updated_by   uuid references public.profiles (id),
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists approvals_client_idx  on public.approvals (client_id);
create index if not exists approvals_status_idx  on public.approvals (status);
create index if not exists approvals_asset_idx   on public.approvals (asset_id);

create table if not exists public.project_milestones (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default '11111111-1111-1111-1111-111111111111'
                references public.organizations (id),
  project_id  uuid not null references public.projects (id) on delete cascade,
  title       text not null,
  due_date    date,
  completed   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists project_milestones_project_idx on public.project_milestones (project_id, due_date);

-- ===========================================================================
-- 3. Trigger
-- ===========================================================================
-- updated_at pflegen
drop trigger if exists set_updated_at on public.website_projects;
create trigger set_updated_at before update on public.website_projects
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.ad_projects;
create trigger set_updated_at before update on public.ad_projects
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.crm_projects;
create trigger set_updated_at before update on public.crm_projects
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.content_projects;
create trigger set_updated_at before update on public.content_projects
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.shoots;
create trigger set_updated_at before update on public.shoots
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.assets;
create trigger set_updated_at before update on public.assets
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.approvals;
create trigger set_updated_at before update on public.approvals
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.project_milestones;
create trigger set_updated_at before update on public.project_milestones
  for each row execute function public.set_updated_at();

-- Identitaets-Stempel beim INSERT (created_by/updated_by = auth.uid())
drop trigger if exists stamp_actor on public.website_projects;
create trigger stamp_actor before insert on public.website_projects
  for each row execute function public.stamp_actor();
drop trigger if exists stamp_actor on public.ad_projects;
create trigger stamp_actor before insert on public.ad_projects
  for each row execute function public.stamp_actor();
drop trigger if exists stamp_actor on public.crm_projects;
create trigger stamp_actor before insert on public.crm_projects
  for each row execute function public.stamp_actor();
drop trigger if exists stamp_actor on public.content_projects;
create trigger stamp_actor before insert on public.content_projects
  for each row execute function public.stamp_actor();
drop trigger if exists stamp_actor on public.shoots;
create trigger stamp_actor before insert on public.shoots
  for each row execute function public.stamp_actor();
drop trigger if exists stamp_actor on public.approvals;
create trigger stamp_actor before insert on public.approvals
  for each row execute function public.stamp_actor();
-- Assets: uploaded_by/updated_by = auth.uid()
drop trigger if exists stamp_uploader on public.assets;
create trigger stamp_uploader before insert on public.assets
  for each row execute function public.stamp_uploader();

-- Beim UPDATE: created_by immutabel halten + updated_by setzen
drop trigger if exists website_projects_stamp_update on public.website_projects;
create trigger website_projects_stamp_update before update on public.website_projects
  for each row execute function public.tasks_stamp_update();
drop trigger if exists ad_projects_stamp_update on public.ad_projects;
create trigger ad_projects_stamp_update before update on public.ad_projects
  for each row execute function public.tasks_stamp_update();
drop trigger if exists crm_projects_stamp_update on public.crm_projects;
create trigger crm_projects_stamp_update before update on public.crm_projects
  for each row execute function public.tasks_stamp_update();
drop trigger if exists content_projects_stamp_update on public.content_projects;
create trigger content_projects_stamp_update before update on public.content_projects
  for each row execute function public.tasks_stamp_update();
drop trigger if exists shoots_stamp_update on public.shoots;
create trigger shoots_stamp_update before update on public.shoots
  for each row execute function public.tasks_stamp_update();
drop trigger if exists approvals_stamp_update on public.approvals;
create trigger approvals_stamp_update before update on public.approvals
  for each row execute function public.tasks_stamp_update();

-- Status gegen die Registry validieren
drop trigger if exists validate_status on public.website_projects;
create trigger validate_status before insert or update on public.website_projects
  for each row execute function public.validate_status('website_project');
drop trigger if exists validate_status on public.ad_projects;
create trigger validate_status before insert or update on public.ad_projects
  for each row execute function public.validate_status('ad_project');
drop trigger if exists validate_status on public.crm_projects;
create trigger validate_status before insert or update on public.crm_projects
  for each row execute function public.validate_status('crm_project');
drop trigger if exists validate_status on public.content_projects;
create trigger validate_status before insert or update on public.content_projects
  for each row execute function public.validate_status('content_project');
drop trigger if exists validate_status on public.shoots;
create trigger validate_status before insert or update on public.shoots
  for each row execute function public.validate_status('shoot');
drop trigger if exists validate_status on public.approvals;
create trigger validate_status before insert or update on public.approvals
  for each row execute function public.validate_status('approval');

-- ===========================================================================
-- 4. Row Level Security
-- ===========================================================================
alter table public.website_projects   enable row level security;
alter table public.ad_projects         enable row level security;
alter table public.crm_projects        enable row level security;
alter table public.content_projects    enable row level security;
alter table public.shoots              enable row level security;
alter table public.assets              enable row level security;
alter table public.approvals           enable row level security;
alter table public.project_milestones  enable row level security;

-- Hilfs-Pattern: statused Projektart mit owner_id ------------------------------
-- website / ad / crm / content
do $$
declare t text;
begin
  foreach t in array array['website_projects','ad_projects','crm_projects','content_projects']
  loop
    execute format('drop policy if exists "%1$s_select" on public.%1$s;', t);
    execute format('create policy "%1$s_select" on public.%1$s for select to authenticated using (deleted_at is null or public.is_super_admin());', t);
    execute format('drop policy if exists "%1$s_insert" on public.%1$s;', t);
    execute format('create policy "%1$s_insert" on public.%1$s for insert to authenticated with check (true);', t);
    execute format('drop policy if exists "%1$s_update" on public.%1$s;', t);
    execute format('create policy "%1$s_update" on public.%1$s for update to authenticated using (public.can_manage(owner_id) or created_by = auth.uid()) with check (public.can_manage(owner_id) or created_by = auth.uid());', t);
    execute format('drop policy if exists "%1$s_delete" on public.%1$s;', t);
    execute format('create policy "%1$s_delete" on public.%1$s for delete to authenticated using (public.is_super_admin());', t);
  end loop;
end $$;

-- shoots (kein owner_id -> created_by)
drop policy if exists "shoots_select" on public.shoots;
create policy "shoots_select" on public.shoots for select to authenticated
  using (deleted_at is null or public.is_super_admin());
drop policy if exists "shoots_insert" on public.shoots;
create policy "shoots_insert" on public.shoots for insert to authenticated with check (true);
drop policy if exists "shoots_update" on public.shoots;
create policy "shoots_update" on public.shoots for update to authenticated
  using (public.can_manage(created_by) or created_by = auth.uid())
  with check (public.can_manage(created_by) or created_by = auth.uid());
drop policy if exists "shoots_delete" on public.shoots;
create policy "shoots_delete" on public.shoots for delete to authenticated
  using (public.is_super_admin());

-- assets (uploaded_by als Eigentuemer)
drop policy if exists "assets_select" on public.assets;
create policy "assets_select" on public.assets for select to authenticated
  using (deleted_at is null or public.is_super_admin());
drop policy if exists "assets_insert" on public.assets;
create policy "assets_insert" on public.assets for insert to authenticated with check (true);
drop policy if exists "assets_update" on public.assets;
create policy "assets_update" on public.assets for update to authenticated
  using (uploaded_by = auth.uid() or public.can_manage(null))
  with check (uploaded_by = auth.uid() or public.can_manage(null));
drop policy if exists "assets_delete" on public.assets;
create policy "assets_delete" on public.assets for delete to authenticated
  using (uploaded_by = auth.uid() or public.is_super_admin());

-- approvals
drop policy if exists "approvals_select" on public.approvals;
create policy "approvals_select" on public.approvals for select to authenticated
  using (deleted_at is null or public.is_super_admin());
drop policy if exists "approvals_insert" on public.approvals;
create policy "approvals_insert" on public.approvals for insert to authenticated with check (true);
drop policy if exists "approvals_update" on public.approvals;
create policy "approvals_update" on public.approvals for update to authenticated
  using (created_by = auth.uid() or public.can_manage(null))
  with check (created_by = auth.uid() or public.can_manage(null));
drop policy if exists "approvals_delete" on public.approvals;
create policy "approvals_delete" on public.approvals for delete to authenticated
  using (public.is_super_admin());

-- project_milestones (team-kollaborativ; an ein Projekt gebunden)
drop policy if exists "project_milestones_select" on public.project_milestones;
create policy "project_milestones_select" on public.project_milestones for select to authenticated
  using (true);
drop policy if exists "project_milestones_write" on public.project_milestones;
create policy "project_milestones_write" on public.project_milestones for all to authenticated
  using (true) with check (true);
