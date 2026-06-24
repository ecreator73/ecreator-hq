-- eCreator OS - komplettes DB-Setup (Migrationen 0001-0017 in Reihenfolge)
-- Im Supabase SQL-Editor einfuegen und ausfuehren (Run).


-- ============================================================
-- 0001_phase1_foundation.sql
-- ============================================================
-- ===========================================================================
-- eCreator OS - Phase 1: Foundation (Identitaet, Rollen, Rechte, Audit)
-- ---------------------------------------------------------------------------
-- Enthaelt NUR die Tabellen, die Phase 1 braucht:
--   organizations, profiles, roles, user_roles, permissions,
--   role_permissions, activity_logs, audits
-- Row Level Security ist aktiviert und mit sinnvollen Basis-Policies versehen.
-- Ausfuehren im Supabase SQL Editor oder via `supabase db push`.
-- ===========================================================================

create extension if not exists pgcrypto;

-- Feste ID der Standard-Organisation (Single-Tenant, aber zukunftssicher).
-- 11111111-1111-1111-1111-111111111111 = eCreator GmbH

-- ---------------------------------------------------------------------------
-- Hilfsfunktion: updated_at automatisch pflegen
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ===========================================================================
-- Tabellen
-- ===========================================================================

-- Organisationen (Single-Tenant: vorerst nur eCreator GmbH)
create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Profile (spiegelt auth.users, traegt App-Stammdaten)
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  org_id      uuid not null default '11111111-1111-1111-1111-111111111111'
                references public.organizations (id),
  full_name   text,
  email       text,
  avatar_url  text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists profiles_org_id_idx on public.profiles (org_id);

-- Rollen (die 9 kanonischen Rollen)
create table if not exists public.roles (
  id          uuid primary key default gen_random_uuid(),
  key         text unique not null,
  name        text not null,
  description text,
  level       integer not null default 5,
  created_at  timestamptz not null default now()
);

-- Zuordnung Benutzer <-> Rollen (n:m)
create table if not exists public.user_roles (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  role_id     uuid not null references public.roles (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references public.profiles (id),
  primary key (user_id, role_id)
);
create index if not exists user_roles_role_id_idx on public.user_roles (role_id);

-- Granulare Rechte (Schema: modul.aktion)
create table if not exists public.permissions (
  id          uuid primary key default gen_random_uuid(),
  key         text unique not null,
  module      text not null,
  action      text not null,
  description text,
  created_at  timestamptz not null default now()
);

-- Zuordnung Rolle <-> Recht (n:m)
create table if not exists public.role_permissions (
  role_id       uuid not null references public.roles (id) on delete cascade,
  permission_id uuid not null references public.permissions (id) on delete cascade,
  primary key (role_id, permission_id)
);

-- Fachlicher Aktivitaets-Feed
create table if not exists public.activity_logs (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default '11111111-1111-1111-1111-111111111111'
                references public.organizations (id),
  actor_id    uuid references public.profiles (id) on delete set null,
  action      text not null,
  entity_type text,
  entity_id   uuid,
  summary     text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists activity_logs_created_at_idx
  on public.activity_logs (created_at desc);
create index if not exists activity_logs_entity_idx
  on public.activity_logs (entity_type, entity_id);

-- Revisionssicherer Audit-Trail sicherheitsrelevanter Aktionen
create table if not exists public.audits (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default '11111111-1111-1111-1111-111111111111'
                references public.organizations (id),
  actor_id    uuid references public.profiles (id) on delete set null,
  action      text not null,
  entity_type text,
  entity_id   uuid,
  old_values  jsonb,
  new_values  jsonb,
  ip          text,
  created_at  timestamptz not null default now()
);
create index if not exists audits_created_at_idx
  on public.audits (created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at Trigger
-- ---------------------------------------------------------------------------
drop trigger if exists set_updated_at on public.organizations;
create trigger set_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- Auth-Helfer (SECURITY DEFINER -> umgeht RLS, verhindert Policy-Rekursion)
-- ===========================================================================
create or replace function public.has_role(role_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.key = role_key
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('super_admin');
$$;

-- ===========================================================================
-- Neuer Auth-User -> automatisch Profil anlegen
-- ===========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, org_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    '11111111-1111-1111-1111-111111111111'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table public.organizations   enable row level security;
alter table public.profiles         enable row level security;
alter table public.roles            enable row level security;
alter table public.user_roles       enable row level security;
alter table public.permissions      enable row level security;
alter table public.role_permissions enable row level security;
alter table public.activity_logs    enable row level security;
alter table public.audits           enable row level security;

-- organizations
drop policy if exists "org_select" on public.organizations;
create policy "org_select" on public.organizations
  for select to authenticated using (true);
drop policy if exists "org_manage" on public.organizations;
create policy "org_manage" on public.organizations
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- profiles
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "profiles_admin_manage" on public.profiles;
create policy "profiles_admin_manage" on public.profiles
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- roles / permissions: lesbar fuer alle Eingeloggten, schreibbar nur Super Admin
drop policy if exists "roles_select" on public.roles;
create policy "roles_select" on public.roles
  for select to authenticated using (true);
drop policy if exists "roles_manage" on public.roles;
create policy "roles_manage" on public.roles
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "permissions_select" on public.permissions;
create policy "permissions_select" on public.permissions
  for select to authenticated using (true);
drop policy if exists "permissions_manage" on public.permissions;
create policy "permissions_manage" on public.permissions
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- user_roles / role_permissions
drop policy if exists "user_roles_select" on public.user_roles;
create policy "user_roles_select" on public.user_roles
  for select to authenticated using (true);
drop policy if exists "user_roles_manage" on public.user_roles;
create policy "user_roles_manage" on public.user_roles
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "role_permissions_select" on public.role_permissions;
create policy "role_permissions_select" on public.role_permissions
  for select to authenticated using (true);
drop policy if exists "role_permissions_manage" on public.role_permissions;
create policy "role_permissions_manage" on public.role_permissions
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- activity_logs: alle lesen (eigene Org), eintragen nur als man selbst
drop policy if exists "activity_select" on public.activity_logs;
create policy "activity_select" on public.activity_logs
  for select to authenticated using (true);
drop policy if exists "activity_insert" on public.activity_logs;
create policy "activity_insert" on public.activity_logs
  for insert to authenticated with check (actor_id = auth.uid());

-- audits: nur Super Admin / CEO lesen; eintragen als man selbst
drop policy if exists "audits_select" on public.audits;
create policy "audits_select" on public.audits
  for select to authenticated
  using (public.is_super_admin() or public.has_role('ceo'));
drop policy if exists "audits_insert" on public.audits;
create policy "audits_insert" on public.audits
  for insert to authenticated with check (actor_id = auth.uid());

-- ===========================================================================
-- Seed-Daten
-- ===========================================================================

-- Standard-Organisation
insert into public.organizations (id, name, slug)
values ('11111111-1111-1111-1111-111111111111', 'eCreator GmbH', 'ecreator')
on conflict (id) do nothing;

-- Die 9 Rollen
insert into public.roles (key, name, description, level) values
  ('super_admin',     'Super Admin',     'Technischer Vollzugriff inkl. Organisation, Rollen, Integrationen und Audit Logs.', 1),
  ('ceo',             'CEO',             'Geschaeftsfuehrung mit lesendem Vollblick und strategischer Steuerung.',           2),
  ('cso',             'CSO',             'Verantwortet Vertrieb und Wachstum end-to-end.',                                   2),
  ('sales',           'Sales',           'Bearbeitet Leads, Angebote und Outreach bis zum Abschluss.',                       3),
  ('project_manager', 'Project Manager', 'Plant und koordiniert Projekte, Aufgaben und Liefertermine.',                      3),
  ('developer',       'Developer',       'Setzt Website- und CRM-Builds technisch um.',                                      3),
  ('creative',        'Creative',        'Produziert Content, Skripte und Drehs.',                                           3),
  ('finance',         'Finance',         'Verwaltet Rechnungen, Ausgaben, wiederkehrende Umsaetze und Berichte.',            3),
  ('viewer',          'Viewer',          'Reiner Lesezugriff auf freigegebene Bereiche.',                                    9)
on conflict (key) do nothing;

-- Rechte-Katalog: 7 Module x 5 Aktionen
insert into public.permissions (key, module, action, description)
select m || '.' || a, m, a, 'Recht "' || a || '" im Modul "' || m || '"'
from unnest(array['home','sales','clients','production','operations','finance','settings']) as m
cross join unnest(array['view','create','edit','delete','manage']) as a
on conflict (key) do nothing;

-- Super Admin erhaelt alle Rechte
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.key = 'super_admin'
on conflict do nothing;

-- Viewer erhaelt alle Ansehen-Rechte
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.action = 'view'
where r.key = 'viewer'
on conflict do nothing;


-- ============================================================
-- 0002_core_business_entities.sql
-- ============================================================
-- ===========================================================================
-- eCreator OS - Phase 2: Core Business Entities & Datenmodell
-- ---------------------------------------------------------------------------
-- Baut das fachliche Fundament fuer Sales, Clients, Production, Finance:
--   statuses, priorities (zentrale Registry),
--   clients, contacts, projects, files, meetings, contracts, offers
-- Konventionen gemaess Blueprint (00 §8 / 03):
--   - id uuid, org_id, created_by/updated_by, created_at/updated_at, deleted_at
--   - Enum-Werte englisch/snake_case in der DB; deutsche Labels in `statuses`
--   - Geld als Ganzzahl in Rappen + `currency` (Default CHF)
-- activity_logs + audits stammen aus Phase 1 (0001) und werden NICHT dupliziert.
-- Ausfuehren NACH 0001_phase1_foundation.sql.
-- ===========================================================================

create extension if not exists pgcrypto;

-- Konstante Standard-Organisation (aus 0001):
--   11111111-1111-1111-1111-111111111111 = eCreator GmbH

-- ===========================================================================
-- 1. Zentrale Registry: statuses & priorities (keine hardcodierten Statuswerte)
-- ===========================================================================

-- Statuswerte aller Entitaeten an einem Ort. `entity_type` trennt die Domaenen
-- (client, project, offer, contract, ...). `key` = englischer DB-Wert,
-- `label` = deutsche UI-Beschriftung.
create table if not exists public.statuses (
  id          uuid primary key default gen_random_uuid(),
  entity_type text not null,
  key         text not null,
  label       text not null,
  color       text,
  sort_order  integer not null default 0,
  is_default  boolean not null default false,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (entity_type, key)
);
create index if not exists statuses_entity_type_idx
  on public.statuses (entity_type, sort_order);

-- Prioritaeten (wiederverwendbar fuer projects und spaeter tasks).
create table if not exists public.priorities (
  id          uuid primary key default gen_random_uuid(),
  key         text unique not null,
  label       text not null,
  level       integer not null,
  color       text,
  sort_order  integer not null default 0,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Validierungs-Trigger: prueft Status/Prioritaet gegen die Registry
-- (referenzielle Integritaet OHNE hardcodierte CHECK-Listen).
-- ---------------------------------------------------------------------------
create or replace function public.validate_status()
returns trigger
language plpgsql
as $$
begin
  if new.status is not null and not exists (
    select 1 from public.statuses s
    where s.entity_type = tg_argv[0]
      and s.key = new.status
      and s.is_active
  ) then
    raise exception 'Ungueltiger Status "%" fuer Entitaet "%"', new.status, tg_argv[0];
  end if;
  return new;
end;
$$;

create or replace function public.validate_priority()
returns trigger
language plpgsql
as $$
begin
  if new.priority is not null and not exists (
    select 1 from public.priorities p where p.key = new.priority
  ) then
    raise exception 'Ungueltige Prioritaet "%"', new.priority;
  end if;
  return new;
end;
$$;

-- ===========================================================================
-- 2. Berechtigungs-Helfer fuer RLS (vorbereitet, erweiterbar)
-- ===========================================================================
-- Darf der aktuelle Nutzer einen Datensatz mit gegebenem Owner verwalten?
-- Super Admin / CEO / CSO / PM duerfen breit; sonst nur der Owner selbst.
create or replace function public.can_manage(owner uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_super_admin()
    or public.has_role('ceo')
    or public.has_role('cso')
    or public.has_role('project_manager')
    or (owner is not null and owner = auth.uid());
$$;

-- ===========================================================================
-- 3. clients
-- ===========================================================================
create table if not exists public.clients (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null default '11111111-1111-1111-1111-111111111111'
                       references public.organizations (id),
  name               text not null,
  company_type       text,
  website            text,
  email              text,
  phone              text,
  address            text,
  city               text,
  country            text,
  industry           text,
  status             text not null default 'onboarding',
  account_manager_id uuid references public.profiles (id) on delete set null,
  start_date         date,
  notes              text,
  created_by         uuid references public.profiles (id),
  updated_by         uuid references public.profiles (id),
  deleted_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists clients_org_idx on public.clients (org_id);
create index if not exists clients_status_idx on public.clients (status);
create index if not exists clients_account_manager_idx on public.clients (account_manager_id);
create index if not exists clients_active_idx on public.clients (deleted_at) where deleted_at is null;

-- ===========================================================================
-- 4. contacts (Client 1 -> n Contacts)
-- ===========================================================================
create table if not exists public.contacts (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default '11111111-1111-1111-1111-111111111111'
                references public.organizations (id),
  client_id   uuid not null references public.clients (id) on delete cascade,
  first_name  text not null,
  last_name   text,
  email       text,
  phone       text,
  position    text,
  is_primary  boolean not null default false,
  notes       text,
  created_by  uuid references public.profiles (id),
  updated_by  uuid references public.profiles (id),
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists contacts_client_idx on public.contacts (client_id);
-- Maximal ein primaerer Kontakt je Kunde (aktiv).
create unique index if not exists contacts_one_primary_per_client
  on public.contacts (client_id)
  where is_primary and deleted_at is null;

-- ===========================================================================
-- 5. projects (Client 1 -> n Projects; User 1 -> n Projects)
-- ===========================================================================
create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null default '11111111-1111-1111-1111-111111111111'
                 references public.organizations (id),
  client_id    uuid references public.clients (id) on delete cascade,
  title        text not null,
  description  text,
  project_type text not null,
  status       text not null default 'planned',
  priority     text not null default 'medium',
  start_date   date,
  due_date     date,
  owner_id     uuid references public.profiles (id) on delete set null,
  created_by   uuid references public.profiles (id),
  updated_by   uuid references public.profiles (id),
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists projects_client_idx on public.projects (client_id);
create index if not exists projects_owner_idx on public.projects (owner_id);
create index if not exists projects_status_idx on public.projects (status);
create index if not exists projects_type_idx on public.projects (project_type);
create index if not exists projects_due_date_idx on public.projects (due_date);

-- ===========================================================================
-- 6. files (Project 1 -> n Files; auch direkt am Client moeglich)
-- ===========================================================================
create table if not exists public.files (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default '11111111-1111-1111-1111-111111111111'
                references public.organizations (id),
  client_id   uuid references public.clients (id) on delete cascade,
  project_id  uuid references public.projects (id) on delete cascade,
  uploaded_by uuid references public.profiles (id) on delete set null,
  updated_by  uuid references public.profiles (id),
  filename    text not null,
  file_url    text not null,
  mime_type   text,
  size        bigint,
  category    text,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists files_client_idx on public.files (client_id);
create index if not exists files_project_idx on public.files (project_id);
create index if not exists files_uploaded_by_idx on public.files (uploaded_by);
create index if not exists files_category_idx on public.files (category);

-- ===========================================================================
-- 7. meetings (Client 1 -> n Meetings)
-- ===========================================================================
create table if not exists public.meetings (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null default '11111111-1111-1111-1111-111111111111'
                 references public.organizations (id),
  client_id    uuid references public.clients (id) on delete cascade,
  title        text not null,
  meeting_date timestamptz,
  participants jsonb not null default '[]'::jsonb,
  notes        text,
  decisions    text,
  next_steps   text,
  created_by   uuid references public.profiles (id),
  updated_by   uuid references public.profiles (id),
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists meetings_client_idx on public.meetings (client_id);
create index if not exists meetings_date_idx on public.meetings (meeting_date desc);

-- ===========================================================================
-- 8. contracts (Client 1 -> n Contracts)
-- ===========================================================================
create table if not exists public.contracts (
  id                       uuid primary key default gen_random_uuid(),
  org_id                   uuid not null default '11111111-1111-1111-1111-111111111111'
                             references public.organizations (id),
  client_id                uuid not null references public.clients (id) on delete cascade,
  title                    text not null,
  contract_type            text,
  start_date               date,
  end_date                 date,
  renewal_type             text,
  cancellation_notice_days integer,
  value_monthly            integer,        -- Rappen
  value_total              integer,        -- Rappen
  currency                 text not null default 'CHF',
  status                   text not null default 'draft',
  document_url             text,
  created_by               uuid references public.profiles (id),
  updated_by               uuid references public.profiles (id),
  deleted_at               timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index if not exists contracts_client_idx on public.contracts (client_id);
create index if not exists contracts_status_idx on public.contracts (status);
create index if not exists contracts_end_date_idx on public.contracts (end_date);

-- ===========================================================================
-- 9. offers (Client 1 -> n Offers)
-- ===========================================================================
create table if not exists public.offers (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null default '11111111-1111-1111-1111-111111111111'
                  references public.organizations (id),
  client_id     uuid not null references public.clients (id) on delete cascade,
  title         text not null,
  amount        integer,                   -- Rappen
  currency      text not null default 'CHF',
  status        text not null default 'draft',
  sent_date     date,
  accepted_date date,
  pdf_url       text,
  created_by    uuid references public.profiles (id),
  updated_by    uuid references public.profiles (id),
  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists offers_client_idx on public.offers (client_id);
create index if not exists offers_status_idx on public.offers (status);

-- ===========================================================================
-- 10. Trigger anhaengen (updated_at + Status-/Prioritaets-Validierung)
-- ===========================================================================
do $$
declare
  t text;
begin
  foreach t in array array['clients','contacts','projects','files','meetings','contracts','offers']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
  end loop;
end;
$$;

-- Status-Validierung je Entitaet
drop trigger if exists validate_status on public.clients;
create trigger validate_status before insert or update on public.clients
  for each row execute function public.validate_status('client');
drop trigger if exists validate_status on public.projects;
create trigger validate_status before insert or update on public.projects
  for each row execute function public.validate_status('project');
drop trigger if exists validate_status on public.offers;
create trigger validate_status before insert or update on public.offers
  for each row execute function public.validate_status('offer');
drop trigger if exists validate_status on public.contracts;
create trigger validate_status before insert or update on public.contracts
  for each row execute function public.validate_status('contract');

-- Prioritaets-Validierung
drop trigger if exists validate_priority on public.projects;
create trigger validate_priority before insert or update on public.projects
  for each row execute function public.validate_priority();

-- ---------------------------------------------------------------------------
-- Identitaets-Stempel beim INSERT: created_by/updated_by bzw. uploaded_by werden
-- serverseitig auf auth.uid() gesetzt. Das verhindert Client-seitiges Spoofing
-- der Owner-/Audit-Spalten - daher koennen die INSERT-Policies WITH CHECK (true)
-- bleiben (die Identitaet ist datenbankseitig erzwungen).
-- ---------------------------------------------------------------------------
create or replace function public.stamp_actor()
returns trigger
language plpgsql
as $$
begin
  new.created_by := auth.uid();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create or replace function public.stamp_uploader()
returns trigger
language plpgsql
as $$
begin
  new.uploaded_by := auth.uid();
  new.updated_by := auth.uid();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['clients','contacts','projects','meetings','contracts','offers']
  loop
    execute format('drop trigger if exists stamp_actor on public.%I', t);
    execute format(
      'create trigger stamp_actor before insert on public.%I
         for each row execute function public.stamp_actor()', t);
  end loop;
end;
$$;

drop trigger if exists stamp_uploader on public.files;
create trigger stamp_uploader before insert on public.files
  for each row execute function public.stamp_uploader();

-- ===========================================================================
-- 11. Row Level Security (vorbereitet - Basis-Policies)
-- ===========================================================================
-- Muster je fachlicher Tabelle:
--   SELECT  : alle eingeloggten Org-Mitglieder (nicht soft-geloeschte)
--   INSERT  : alle eingeloggten Nutzer (created_by/uploaded_by setzt der Service)
--   UPDATE  : can_manage(owner) - Owner + breite Rollen
--   DELETE  : nur super_admin (harte Loeschung; sonst Soft-Delete via UPDATE)
-- Spaetere Phasen verfeinern die Sichtbarkeit (z.B. Sales nur eigene Daten).

-- Registry: fuer alle lesbar, nur Super Admin verwaltet.
alter table public.statuses   enable row level security;
alter table public.priorities enable row level security;

drop policy if exists "statuses_select" on public.statuses;
create policy "statuses_select" on public.statuses
  for select to authenticated using (true);
drop policy if exists "statuses_manage" on public.statuses;
create policy "statuses_manage" on public.statuses
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "priorities_select" on public.priorities;
create policy "priorities_select" on public.priorities
  for select to authenticated using (true);
drop policy if exists "priorities_manage" on public.priorities;
create policy "priorities_manage" on public.priorities
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- Fachliche Tabellen
alter table public.clients   enable row level security;
alter table public.contacts  enable row level security;
alter table public.projects  enable row level security;
alter table public.files     enable row level security;
alter table public.meetings  enable row level security;
alter table public.contracts enable row level security;
alter table public.offers    enable row level security;

-- clients
drop policy if exists "clients_select" on public.clients;
create policy "clients_select" on public.clients for select to authenticated
  using (deleted_at is null or public.is_super_admin());
drop policy if exists "clients_insert" on public.clients;
create policy "clients_insert" on public.clients for insert to authenticated
  with check (true);
drop policy if exists "clients_update" on public.clients;
create policy "clients_update" on public.clients for update to authenticated
  using (public.can_manage(account_manager_id) or created_by = auth.uid())
  with check (public.can_manage(account_manager_id) or created_by = auth.uid());
drop policy if exists "clients_delete" on public.clients;
create policy "clients_delete" on public.clients for delete to authenticated
  using (public.is_super_admin());

-- contacts (Owner = created_by; Sichtbarkeit am Kunden)
drop policy if exists "contacts_select" on public.contacts;
create policy "contacts_select" on public.contacts for select to authenticated
  using (deleted_at is null or public.is_super_admin());
drop policy if exists "contacts_insert" on public.contacts;
create policy "contacts_insert" on public.contacts for insert to authenticated
  with check (true);
drop policy if exists "contacts_update" on public.contacts;
create policy "contacts_update" on public.contacts for update to authenticated
  using (public.can_manage(created_by)) with check (public.can_manage(created_by));
drop policy if exists "contacts_delete" on public.contacts;
create policy "contacts_delete" on public.contacts for delete to authenticated
  using (public.is_super_admin());

-- projects (Owner = owner_id)
drop policy if exists "projects_select" on public.projects;
create policy "projects_select" on public.projects for select to authenticated
  using (deleted_at is null or public.is_super_admin());
drop policy if exists "projects_insert" on public.projects;
create policy "projects_insert" on public.projects for insert to authenticated
  with check (true);
drop policy if exists "projects_update" on public.projects;
create policy "projects_update" on public.projects for update to authenticated
  using (public.can_manage(owner_id) or created_by = auth.uid())
  with check (public.can_manage(owner_id) or created_by = auth.uid());
drop policy if exists "projects_delete" on public.projects;
create policy "projects_delete" on public.projects for delete to authenticated
  using (public.is_super_admin());

-- files (Owner = uploaded_by)
drop policy if exists "files_select" on public.files;
create policy "files_select" on public.files for select to authenticated
  using (deleted_at is null or public.is_super_admin());
drop policy if exists "files_insert" on public.files;
create policy "files_insert" on public.files for insert to authenticated
  with check (true);
drop policy if exists "files_update" on public.files;
create policy "files_update" on public.files for update to authenticated
  using (public.can_manage(uploaded_by)) with check (public.can_manage(uploaded_by));
drop policy if exists "files_delete" on public.files;
create policy "files_delete" on public.files for delete to authenticated
  using (public.is_super_admin());

-- meetings (Owner = created_by)
drop policy if exists "meetings_select" on public.meetings;
create policy "meetings_select" on public.meetings for select to authenticated
  using (deleted_at is null or public.is_super_admin());
drop policy if exists "meetings_insert" on public.meetings;
create policy "meetings_insert" on public.meetings for insert to authenticated
  with check (true);
drop policy if exists "meetings_update" on public.meetings;
create policy "meetings_update" on public.meetings for update to authenticated
  using (public.can_manage(created_by)) with check (public.can_manage(created_by));
drop policy if exists "meetings_delete" on public.meetings;
create policy "meetings_delete" on public.meetings for delete to authenticated
  using (public.is_super_admin());

-- contracts (Owner = created_by; sensible Finanzdaten -> Lesen rollenbeschraenkt)
drop policy if exists "contracts_select" on public.contracts;
create policy "contracts_select" on public.contracts for select to authenticated
  using (
    public.is_super_admin()
    or (
      deleted_at is null
      and (
        public.has_role('ceo')
        or public.has_role('cso')
        or public.has_role('finance')
        or created_by = auth.uid()
      )
    )
  );
drop policy if exists "contracts_insert" on public.contracts;
create policy "contracts_insert" on public.contracts for insert to authenticated
  with check (true);
drop policy if exists "contracts_update" on public.contracts;
create policy "contracts_update" on public.contracts for update to authenticated
  using (public.can_manage(created_by)) with check (public.can_manage(created_by));
drop policy if exists "contracts_delete" on public.contracts;
create policy "contracts_delete" on public.contracts for delete to authenticated
  using (public.is_super_admin());

-- offers (Owner = created_by; sensible Finanzdaten -> Lesen rollenbeschraenkt)
drop policy if exists "offers_select" on public.offers;
create policy "offers_select" on public.offers for select to authenticated
  using (
    public.is_super_admin()
    or (
      deleted_at is null
      and (
        public.has_role('ceo')
        or public.has_role('cso')
        or public.has_role('finance')
        or created_by = auth.uid()
      )
    )
  );
drop policy if exists "offers_insert" on public.offers;
create policy "offers_insert" on public.offers for insert to authenticated
  with check (true);
drop policy if exists "offers_update" on public.offers;
create policy "offers_update" on public.offers for update to authenticated
  using (public.can_manage(created_by)) with check (public.can_manage(created_by));
drop policy if exists "offers_delete" on public.offers;
create policy "offers_delete" on public.offers for delete to authenticated
  using (public.is_super_admin());

-- ===========================================================================
-- 12. Seed der Registry (Struktur-Seed, KEINE Demo-/Fake-Daten)
-- ===========================================================================
insert into public.statuses (entity_type, key, label, color, sort_order, is_default) values
  ('client',   'active',     'Aktiv',         'green', 1, false),
  ('client',   'onboarding', 'Onboarding',    'blue',  2, true),
  ('client',   'paused',     'Pausiert',      'amber', 3, false),
  ('client',   'ended',      'Beendet',       'gray',  4, false),

  ('project',  'planned',    'Geplant',       'gray',  1, true),
  ('project',  'active',     'Aktiv',         'green', 2, false),
  ('project',  'on_hold',    'Pausiert',      'amber', 3, false),
  ('project',  'completed',  'Abgeschlossen', 'blue',  4, false),
  ('project',  'cancelled',  'Abgebrochen',   'red',   5, false),

  ('offer',    'draft',      'Entwurf',       'gray',  1, true),
  ('offer',    'sent',       'Gesendet',      'blue',  2, false),
  ('offer',    'accepted',   'Akzeptiert',    'green', 3, false),
  ('offer',    'rejected',   'Abgelehnt',     'red',   4, false),
  ('offer',    'expired',    'Abgelaufen',    'amber', 5, false),

  ('contract', 'draft',      'Entwurf',       'gray',  1, true),
  ('contract', 'active',     'Aktiv',         'green', 2, false),
  ('contract', 'expired',    'Abgelaufen',    'amber', 3, false),
  ('contract', 'cancelled',  'Gekuendigt',    'red',   4, false)
on conflict (entity_type, key) do nothing;

insert into public.priorities (key, label, level, color, sort_order, is_default) values
  ('low',    'Niedrig', 1, 'gray',  1, false),
  ('medium', 'Mittel',  2, 'blue',  2, true),
  ('high',   'Hoch',    3, 'amber', 3, false),
  ('urgent', 'Dringend',4, 'red',   4, false)
on conflict (key) do nothing;


-- ============================================================
-- 0003_task_system.sql
-- ============================================================
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


-- ============================================================
-- 0004_sales_crm.sql
-- ============================================================
-- ===========================================================================
-- eCreator OS - Phase 4: Sales CRM (Leads, Pipeline, Angebote, Vertraege)
-- ---------------------------------------------------------------------------
-- Neu: leads, sales_activities + Registry (lead-/meeting-Status).
-- Erweitert (KEINE Duplikate): meetings (lead_id/status/duration),
--   offers (lead_id/offer_type/valid_until/owner_id, client_id nullable),
--   contracts (offer_id).
-- Nutzt Helfer aus 0001/0002: is_super_admin, has_role, can_manage,
--   stamp_actor, set_updated_at, validate_status, statuses/priorities.
-- Ausfuehren NACH 0003.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Registry erweitern: Lead-Status + Meeting-Status
-- ---------------------------------------------------------------------------
insert into public.statuses (entity_type, key, label, color, sort_order, is_default) values
  ('lead', 'new',           'Neu',             'gray',  1, true),
  ('lead', 'contacted',     'Kontaktiert',     'blue',  2, false),
  ('lead', 'interested',    'Interesse',       'blue',  3, false),
  ('lead', 'meeting_booked','Termin gebucht',  'blue',  4, false),
  ('lead', 'offer_created', 'Angebot erstellt','amber', 5, false),
  ('lead', 'offer_sent',    'Angebot gesendet','amber', 6, false),
  ('lead', 'negotiation',   'Verhandlung',     'amber', 7, false),
  ('lead', 'won',           'Gewonnen',        'green', 8, false),
  ('lead', 'lost',          'Verloren',        'red',   9, false),
  ('lead', 'paused',        'Pausiert',        'gray', 10, false),

  ('meeting', 'planned',     'Geplant',        'gray',  1, true),
  ('meeting', 'completed',   'Durchgefuehrt',  'green', 2, false),
  ('meeting', 'cancelled',   'Abgesagt',       'red',   3, false),
  ('meeting', 'rescheduled', 'Verschoben',     'amber', 4, false)
on conflict (entity_type, key) do nothing;

-- ---------------------------------------------------------------------------
-- 2. leads
-- ---------------------------------------------------------------------------
create table if not exists public.leads (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null default '11111111-1111-1111-1111-111111111111'
                     references public.organizations (id),
  company_name     text not null,
  contact_name     text,
  email            text,
  phone            text,
  website          text,
  industry         text,
  company_size     text,
  city             text,
  country          text,
  source           text,
  lead_score       integer not null default 0,
  estimated_value  integer,                 -- Rappen
  currency         text not null default 'CHF',
  status_id        uuid not null references public.statuses (id),
  owner_id         uuid references public.profiles (id) on delete set null,
  notes            text,
  next_action_date date,
  created_by       uuid references public.profiles (id),
  updated_by       uuid references public.profiles (id),
  deleted_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists leads_status_idx on public.leads (status_id);
create index if not exists leads_owner_idx on public.leads (owner_id);
create index if not exists leads_next_action_idx on public.leads (next_action_date);
create index if not exists leads_score_idx on public.leads (lead_score desc);
create index if not exists leads_source_idx on public.leads (source);
create index if not exists leads_active_idx on public.leads (deleted_at) where deleted_at is null;

-- ---------------------------------------------------------------------------
-- 3. sales_activities (Touchpoint-Zeitleiste je Lead)
-- ---------------------------------------------------------------------------
create table if not exists public.sales_activities (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null default '11111111-1111-1111-1111-111111111111'
                  references public.organizations (id),
  lead_id       uuid not null references public.leads (id) on delete cascade,
  type          text not null,        -- call/email/meeting/offer/note/followup
  subject       text,
  body          text,
  activity_date timestamptz not null default now(),
  created_by    uuid references public.profiles (id),
  created_at    timestamptz not null default now()
);
create index if not exists sales_activities_lead_idx
  on public.sales_activities (lead_id, activity_date desc);

-- ---------------------------------------------------------------------------
-- 4. Bestehende Tabellen erweitern (keine Duplikate)
-- ---------------------------------------------------------------------------
-- meetings: Sales-Termine an Leads + Status + Dauer
alter table public.meetings
  add column if not exists lead_id uuid references public.leads (id) on delete set null,
  add column if not exists status text not null default 'planned',
  add column if not exists duration_minutes integer;
create index if not exists meetings_lead_idx on public.meetings (lead_id);

-- offers: koennen einem Lead gehoeren (vor Kundenstatus); Typ/Ablauf/Owner
alter table public.offers
  add column if not exists lead_id uuid references public.leads (id) on delete set null,
  add column if not exists offer_type text,
  add column if not exists valid_until date,
  add column if not exists owner_id uuid references public.profiles (id) on delete set null;
alter table public.offers alter column client_id drop not null;
create index if not exists offers_lead_idx on public.offers (lead_id);
create index if not exists offers_owner_idx on public.offers (owner_id);

-- contracts: Herkunft aus einem Angebot (Angebot -> Vertrag)
alter table public.contracts
  add column if not exists offer_id uuid references public.offers (id) on delete set null;
create index if not exists contracts_offer_idx on public.contracts (offer_id);

-- tasks koennen direkt an einem Lead haengen (Lead-Detail -> Aufgaben-Tab)
alter table public.tasks
  add column if not exists lead_id uuid references public.leads (id) on delete set null;
create index if not exists tasks_lead_idx on public.tasks (lead_id);

-- ---------------------------------------------------------------------------
-- 5. Trigger
-- ---------------------------------------------------------------------------
-- updated_at + created_by/updated_by fuer leads
drop trigger if exists set_updated_at on public.leads;
create trigger set_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

drop trigger if exists stamp_actor on public.leads;
create trigger stamp_actor before insert on public.leads
  for each row execute function public.stamp_actor();

-- created_by unveraenderlich + updated_by stempeln (analog tasks)
drop trigger if exists leads_stamp_update on public.leads;
create trigger leads_stamp_update before update on public.leads
  for each row execute function public.tasks_stamp_update();

-- created_by-Stempel fuer sales_activities
create or replace function public.stamp_created_by_only()
returns trigger
language plpgsql
as $$
begin
  new.created_by := auth.uid();
  return new;
end;
$$;
drop trigger if exists stamp_created_by on public.sales_activities;
create trigger stamp_created_by before insert on public.sales_activities
  for each row execute function public.stamp_created_by_only();

-- Default-Status fuer leads
create or replace function public.set_lead_defaults()
returns trigger
language plpgsql
as $$
begin
  if new.status_id is null then
    select id into new.status_id
    from public.statuses
    where entity_type = 'lead' and is_default
    order by sort_order
    limit 1;
  end if;
  return new;
end;
$$;
drop trigger if exists set_lead_defaults on public.leads;
create trigger set_lead_defaults before insert on public.leads
  for each row execute function public.set_lead_defaults();

-- Status-Validierung
drop trigger if exists validate_status on public.leads;
create trigger validate_status before insert or update on public.leads
  for each row execute function public.validate_status('lead');
drop trigger if exists validate_status_meeting on public.meetings;
create trigger validate_status_meeting before insert or update on public.meetings
  for each row execute function public.validate_status('meeting');

-- ===========================================================================
-- 6. Row Level Security
-- ===========================================================================
alter table public.leads            enable row level security;
alter table public.sales_activities enable row level security;

-- leads: alle eingeloggten sehen nicht-geloeschte; Owner/Ersteller + breite
-- Rollen aendern; harte Loeschung nur super_admin.
drop policy if exists "leads_select" on public.leads;
create policy "leads_select" on public.leads for select to authenticated
  using (deleted_at is null or public.is_super_admin());
drop policy if exists "leads_insert" on public.leads;
create policy "leads_insert" on public.leads for insert to authenticated
  with check (true);
drop policy if exists "leads_update" on public.leads;
create policy "leads_update" on public.leads for update to authenticated
  using (public.can_manage(owner_id) or created_by = auth.uid())
  with check (public.can_manage(owner_id) or created_by = auth.uid());
drop policy if exists "leads_delete" on public.leads;
create policy "leads_delete" on public.leads for delete to authenticated
  using (public.is_super_admin());

-- Helfer: ist der Lead fuer den Nutzer sichtbar?
create or replace function public.lead_visible(l_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.leads l
    where l.id = l_id and (l.deleted_at is null or public.is_super_admin())
  );
$$;

-- sales_activities folgen der Lead-Sichtbarkeit
drop policy if exists "sales_activities_select" on public.sales_activities;
create policy "sales_activities_select" on public.sales_activities for select to authenticated
  using (public.lead_visible(lead_id));
drop policy if exists "sales_activities_insert" on public.sales_activities;
create policy "sales_activities_insert" on public.sales_activities for insert to authenticated
  with check (public.lead_visible(lead_id) and created_by = auth.uid());
drop policy if exists "sales_activities_delete" on public.sales_activities;
create policy "sales_activities_delete" on public.sales_activities for delete to authenticated
  using (created_by = auth.uid() or public.is_super_admin());

-- offers-Lesepolicy um owner_id erweitern (Sales sieht eigene Angebote)
drop policy if exists "offers_select" on public.offers;
create policy "offers_select" on public.offers for select to authenticated
  using (
    public.is_super_admin()
    or (
      deleted_at is null
      and (
        public.has_role('ceo')
        or public.has_role('cso')
        or public.has_role('finance')
        or created_by = auth.uid()
        or owner_id = auth.uid()
      )
    )
  );

-- ===========================================================================
-- 7. Reporting-Hilfsfunktion: auslaufende Vertraege (fuer Alerts/Dashboard)
-- ===========================================================================
create or replace function public.contracts_expiring(within_days integer default 90)
returns setof public.contracts
language sql
stable
as $$
  select * from public.contracts
  where deleted_at is null
    and status = 'active'
    and end_date is not null
    and end_date <= (current_date + within_days)
    and end_date >= current_date
  order by end_date asc;
$$;


-- ============================================================
-- 0005_client_management.sql
-- ============================================================
-- ===========================================================================
-- eCreator OS - Phase 5: Client Management & Customer Success
-- ---------------------------------------------------------------------------
-- Neu: reporting_calls, client_interactions, client_checklists(+items).
-- Erweitert: clients (package).
-- Customer-Success-Alerts werden NICHT gespeichert, sondern zur Laufzeit aus
-- den Daten berechnet (immer aktuell). Ausfuehren NACH 0004.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Registry: Reporting-Call-Status
-- ---------------------------------------------------------------------------
insert into public.statuses (entity_type, key, label, color, sort_order, is_default) values
  ('reporting_call', 'open',        'Offen',         'gray',  1, true),
  ('reporting_call', 'scheduled',   'Geplant',       'blue',  2, false),
  ('reporting_call', 'completed',   'Durchgefuehrt', 'green', 3, false),
  ('reporting_call', 'rescheduled', 'Verschoben',    'amber', 4, false),
  ('reporting_call', 'cancelled',   'Abgesagt',      'red',   5, false)
on conflict (entity_type, key) do nothing;

-- ---------------------------------------------------------------------------
-- 2. clients erweitern: Paket
-- ---------------------------------------------------------------------------
alter table public.clients
  add column if not exists package text;

-- ---------------------------------------------------------------------------
-- 3. reporting_calls (zentrale Kundenkommunikation)
-- ---------------------------------------------------------------------------
create table if not exists public.reporting_calls (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null default '11111111-1111-1111-1111-111111111111'
                    references public.organizations (id),
  client_id       uuid not null references public.clients (id) on delete cascade,
  owner_id        uuid references public.profiles (id) on delete set null,
  scheduled_date  timestamptz,
  status          text not null default 'open',
  meeting_link    text,
  agenda          text,
  topics          text,   -- besprochene Themen
  results         text,   -- Resultate
  challenges      text,   -- Herausforderungen
  notes           text,
  summary         text,
  next_steps      text,
  responsibilities text,
  created_by      uuid references public.profiles (id),
  updated_by      uuid references public.profiles (id),
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists reporting_calls_client_idx on public.reporting_calls (client_id);
create index if not exists reporting_calls_owner_idx on public.reporting_calls (owner_id);
create index if not exists reporting_calls_status_idx on public.reporting_calls (status);
create index if not exists reporting_calls_date_idx on public.reporting_calls (scheduled_date);

-- ---------------------------------------------------------------------------
-- 4. client_interactions (Kontakthistorie / Timeline je Kunde)
-- ---------------------------------------------------------------------------
create table if not exists public.client_interactions (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null default '11111111-1111-1111-1111-111111111111'
                     references public.organizations (id),
  client_id        uuid not null references public.clients (id) on delete cascade,
  type             text not null,  -- call/meeting/reporting/email/whatsapp/note
  subject          text,
  body             text,
  interaction_date timestamptz not null default now(),
  created_by       uuid references public.profiles (id),
  created_at       timestamptz not null default now()
);
create index if not exists client_interactions_client_idx
  on public.client_interactions (client_id, interaction_date desc);

-- ---------------------------------------------------------------------------
-- 5. client_checklists + items (Onboarding / Offboarding)
-- ---------------------------------------------------------------------------
create table if not exists public.client_checklists (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null default '11111111-1111-1111-1111-111111111111'
               references public.organizations (id),
  client_id  uuid not null references public.clients (id) on delete cascade,
  kind       text not null,  -- onboarding | offboarding
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index if not exists client_checklists_client_idx
  on public.client_checklists (client_id);

create table if not exists public.client_checklist_items (
  id           uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.client_checklists (id) on delete cascade,
  title        text not null,
  completed    boolean not null default false,
  order_index  integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists client_checklist_items_idx
  on public.client_checklist_items (checklist_id, order_index);

-- ---------------------------------------------------------------------------
-- 6. Trigger
-- ---------------------------------------------------------------------------
drop trigger if exists set_updated_at on public.reporting_calls;
create trigger set_updated_at before update on public.reporting_calls
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.client_checklist_items;
create trigger set_updated_at before update on public.client_checklist_items
  for each row execute function public.set_updated_at();

drop trigger if exists stamp_actor on public.reporting_calls;
create trigger stamp_actor before insert on public.reporting_calls
  for each row execute function public.stamp_actor();
drop trigger if exists reporting_calls_stamp_update on public.reporting_calls;
create trigger reporting_calls_stamp_update before update on public.reporting_calls
  for each row execute function public.tasks_stamp_update();

drop trigger if exists stamp_created_by on public.client_interactions;
create trigger stamp_created_by before insert on public.client_interactions
  for each row execute function public.stamp_created_by_only();
drop trigger if exists stamp_created_by on public.client_checklists;
create trigger stamp_created_by before insert on public.client_checklists
  for each row execute function public.stamp_created_by_only();

drop trigger if exists validate_status on public.reporting_calls;
create trigger validate_status before insert or update on public.reporting_calls
  for each row execute function public.validate_status('reporting_call');

-- ===========================================================================
-- 7. Row Level Security
-- ===========================================================================
alter table public.reporting_calls        enable row level security;
alter table public.client_interactions    enable row level security;
alter table public.client_checklists      enable row level security;
alter table public.client_checklist_items enable row level security;

-- reporting_calls
drop policy if exists "reporting_calls_select" on public.reporting_calls;
create policy "reporting_calls_select" on public.reporting_calls for select to authenticated
  using (deleted_at is null or public.is_super_admin());
drop policy if exists "reporting_calls_insert" on public.reporting_calls;
create policy "reporting_calls_insert" on public.reporting_calls for insert to authenticated
  with check (true);
drop policy if exists "reporting_calls_update" on public.reporting_calls;
create policy "reporting_calls_update" on public.reporting_calls for update to authenticated
  using (public.can_manage(owner_id) or created_by = auth.uid())
  with check (public.can_manage(owner_id) or created_by = auth.uid());
drop policy if exists "reporting_calls_delete" on public.reporting_calls;
create policy "reporting_calls_delete" on public.reporting_calls for delete to authenticated
  using (public.is_super_admin());

-- client_interactions
drop policy if exists "client_interactions_select" on public.client_interactions;
create policy "client_interactions_select" on public.client_interactions for select to authenticated
  using (true);
drop policy if exists "client_interactions_insert" on public.client_interactions;
create policy "client_interactions_insert" on public.client_interactions for insert to authenticated
  with check (created_by = auth.uid());
drop policy if exists "client_interactions_delete" on public.client_interactions;
create policy "client_interactions_delete" on public.client_interactions for delete to authenticated
  using (created_by = auth.uid() or public.is_super_admin());

-- client_checklists + items (eingeloggte verwalten)
drop policy if exists "client_checklists_select" on public.client_checklists;
create policy "client_checklists_select" on public.client_checklists for select to authenticated
  using (true);
drop policy if exists "client_checklists_write" on public.client_checklists;
create policy "client_checklists_write" on public.client_checklists for all to authenticated
  using (true) with check (true);

drop policy if exists "client_checklist_items_select" on public.client_checklist_items;
create policy "client_checklist_items_select" on public.client_checklist_items for select to authenticated
  using (true);
drop policy if exists "client_checklist_items_write" on public.client_checklist_items;
create policy "client_checklist_items_write" on public.client_checklist_items for all to authenticated
  using (true) with check (true);


-- ============================================================
-- 0006_production_hub.sql
-- ============================================================
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


-- ============================================================
-- 0007_creator_pool.sql
-- ============================================================
-- ===========================================================================
-- eCreator OS - Phase 7: Creator Pool, Talent Management & Shooting Staffing
-- ---------------------------------------------------------------------------
-- Internes Creator-CRM (kein Marktplatz): creators, creator_assets (Portfolio),
-- creator_availability, creator_ratings (interne Bewertungen), shoot_assignments
-- (Besetzung). Eigene Status-Saetze (creator, shoot_assignment) in der Registry.
-- Ausfuehren NACH 0006.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Registry: Creator- & Besetzungs-Status
-- ---------------------------------------------------------------------------
insert into public.statuses (entity_type, key, label, color, sort_order, is_default) values
  ('creator', 'new',        'Neu',           'gray',  1, true),
  ('creator', 'contacted',  'Kontaktiert',   'blue',  2, false),
  ('creator', 'interested', 'Interesse',     'blue',  3, false),
  ('creator', 'qualified',  'Qualifiziert',  'amber', 4, false),
  ('creator', 'pool',       'Creator Pool',  'green', 5, false),
  ('creator', 'active',     'Aktiv',         'green', 6, false),
  ('creator', 'inactive',   'Inaktiv',       'gray',  7, false),
  ('creator', 'unsuitable', 'Nicht geeignet','red',   8, false),
  ('shoot_assignment', 'requested', 'Angefragt',     'amber', 1, true),
  ('shoot_assignment', 'confirmed', 'Bestaetigt',    'green', 2, false),
  ('shoot_assignment', 'rejected',  'Abgelehnt',     'red',   3, false),
  ('shoot_assignment', 'done',      'Durchgefuehrt', 'blue',  4, false)
on conflict (entity_type, key) do nothing;

-- ---------------------------------------------------------------------------
-- 2. creators (zentrales Talent-Profil)
-- ---------------------------------------------------------------------------
create table if not exists public.creators (
  id                   uuid primary key default gen_random_uuid(),
  org_id               uuid not null default '11111111-1111-1111-1111-111111111111'
                         references public.organizations (id),
  first_name           text not null,
  last_name            text,
  email                text,
  phone                text,
  city                 text,
  canton               text,
  country              text,
  birth_year           integer,
  gender               text,
  languages            text[] not null default '{}',
  instagram_handle     text,
  instagram_followers  integer,
  tiktok_handle        text,
  tiktok_followers     integer,
  creator_types        text[] not null default '{}',   -- mehrfach
  experience_level     text,
  -- Preise in Rappen
  hourly_rate          bigint,
  half_day_rate        bigint,
  full_day_rate        bigint,
  travel_costs         bigint,
  additional_costs     bigint,
  travel_available     boolean not null default false,
  status               text not null default 'new',
  score                integer not null default 0,      -- Qualifikations-Score 0-100
  creator_group_status text not null default 'not_invited',
  tags                 text[] not null default '{}',
  -- DSG / Einwilligung
  consent_given        boolean not null default false,
  consent_date         timestamptz,
  consent_note         text,
  notes                text,
  created_by           uuid references public.profiles (id),
  updated_by           uuid references public.profiles (id),
  deleted_at           timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists creators_status_idx  on public.creators (status);
create index if not exists creators_canton_idx  on public.creators (canton);
create index if not exists creators_score_idx   on public.creators (score desc);
create index if not exists creators_types_idx   on public.creators using gin (creator_types);
create index if not exists creators_tags_idx    on public.creators using gin (tags);

-- ---------------------------------------------------------------------------
-- 3. creator_assets (Portfolio)
-- ---------------------------------------------------------------------------
create table if not exists public.creator_assets (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default '11111111-1111-1111-1111-111111111111'
                references public.organizations (id),
  creator_id  uuid not null references public.creators (id) on delete cascade,
  title       text,
  category    text,            -- photos/videos/ugc/ads/references
  file_url    text,
  tags        text[] not null default '{}',
  uploaded_by uuid references public.profiles (id),
  updated_by  uuid references public.profiles (id),
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists creator_assets_creator_idx on public.creator_assets (creator_id);

-- ---------------------------------------------------------------------------
-- 4. creator_availability
-- ---------------------------------------------------------------------------
create table if not exists public.creator_availability (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null default '11111111-1111-1111-1111-111111111111'
                      references public.organizations (id),
  creator_id        uuid not null references public.creators (id) on delete cascade,
  start_date        date not null,
  end_date          date,
  availability_type text not null default 'available',  -- available/limited/unavailable
  note              text,
  created_by        uuid references public.profiles (id),
  created_at        timestamptz not null default now()
);
create index if not exists creator_availability_creator_idx
  on public.creator_availability (creator_id, start_date);

-- ---------------------------------------------------------------------------
-- 5. creator_ratings (interne Bewertungen, 1-5 Sterne)
-- ---------------------------------------------------------------------------
create table if not exists public.creator_ratings (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null default '11111111-1111-1111-1111-111111111111'
                    references public.organizations (id),
  creator_id      uuid not null references public.creators (id) on delete cascade,
  shoot_id        uuid references public.shoots (id) on delete set null,
  punctuality     integer,
  appearance      integer,
  camera_quality  integer,
  communication   integer,
  professionalism integer,
  overall         numeric(3,2),   -- Durchschnitt der 5 Kriterien
  comment         text,
  created_by      uuid references public.profiles (id),
  created_at      timestamptz not null default now()
);
create index if not exists creator_ratings_creator_idx on public.creator_ratings (creator_id);

-- ---------------------------------------------------------------------------
-- 6. shoot_assignments (Besetzung / Staffing)
-- ---------------------------------------------------------------------------
create table if not exists public.shoot_assignments (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default '11111111-1111-1111-1111-111111111111'
                references public.organizations (id),
  shoot_id    uuid not null references public.shoots (id) on delete cascade,
  creator_id  uuid not null references public.creators (id) on delete cascade,
  status      text not null default 'requested',
  agreed_rate bigint,   -- Rappen
  note        text,
  created_by  uuid references public.profiles (id),
  updated_by  uuid references public.profiles (id),
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (shoot_id, creator_id)
);
create index if not exists shoot_assignments_shoot_idx   on public.shoot_assignments (shoot_id);
create index if not exists shoot_assignments_creator_idx on public.shoot_assignments (creator_id);
create index if not exists shoot_assignments_status_idx  on public.shoot_assignments (status);

-- ===========================================================================
-- 7. Trigger
-- ===========================================================================
drop trigger if exists set_updated_at on public.creators;
create trigger set_updated_at before update on public.creators
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.creator_assets;
create trigger set_updated_at before update on public.creator_assets
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.shoot_assignments;
create trigger set_updated_at before update on public.shoot_assignments
  for each row execute function public.set_updated_at();

drop trigger if exists stamp_actor on public.creators;
create trigger stamp_actor before insert on public.creators
  for each row execute function public.stamp_actor();
drop trigger if exists creators_stamp_update on public.creators;
create trigger creators_stamp_update before update on public.creators
  for each row execute function public.tasks_stamp_update();

drop trigger if exists stamp_uploader on public.creator_assets;
create trigger stamp_uploader before insert on public.creator_assets
  for each row execute function public.stamp_uploader();

drop trigger if exists stamp_created_by on public.creator_availability;
create trigger stamp_created_by before insert on public.creator_availability
  for each row execute function public.stamp_created_by_only();
drop trigger if exists stamp_created_by on public.creator_ratings;
create trigger stamp_created_by before insert on public.creator_ratings
  for each row execute function public.stamp_created_by_only();

drop trigger if exists stamp_actor on public.shoot_assignments;
create trigger stamp_actor before insert on public.shoot_assignments
  for each row execute function public.stamp_actor();
drop trigger if exists shoot_assignments_stamp_update on public.shoot_assignments;
create trigger shoot_assignments_stamp_update before update on public.shoot_assignments
  for each row execute function public.tasks_stamp_update();

drop trigger if exists validate_status on public.creators;
create trigger validate_status before insert or update on public.creators
  for each row execute function public.validate_status('creator');
drop trigger if exists validate_status on public.shoot_assignments;
create trigger validate_status before insert or update on public.shoot_assignments
  for each row execute function public.validate_status('shoot_assignment');

-- ===========================================================================
-- 8. Row Level Security
-- ===========================================================================
alter table public.creators             enable row level security;
alter table public.creator_assets       enable row level security;
alter table public.creator_availability enable row level security;
alter table public.creator_ratings      enable row level security;
alter table public.shoot_assignments    enable row level security;

-- creators (internes CRM: alle eingeloggten verwalten; Stempel-Trigger erzwingt created_by)
drop policy if exists "creators_select" on public.creators;
create policy "creators_select" on public.creators for select to authenticated
  using (deleted_at is null or public.is_super_admin());
drop policy if exists "creators_insert" on public.creators;
create policy "creators_insert" on public.creators for insert to authenticated with check (true);
drop policy if exists "creators_update" on public.creators;
create policy "creators_update" on public.creators for update to authenticated
  using (true) with check (true);
drop policy if exists "creators_delete" on public.creators;
create policy "creators_delete" on public.creators for delete to authenticated
  using (public.is_super_admin());

-- creator_assets
drop policy if exists "creator_assets_select" on public.creator_assets;
create policy "creator_assets_select" on public.creator_assets for select to authenticated
  using (deleted_at is null or public.is_super_admin());
drop policy if exists "creator_assets_insert" on public.creator_assets;
create policy "creator_assets_insert" on public.creator_assets for insert to authenticated with check (true);
drop policy if exists "creator_assets_update" on public.creator_assets;
create policy "creator_assets_update" on public.creator_assets for update to authenticated
  using (true) with check (true);
drop policy if exists "creator_assets_delete" on public.creator_assets;
create policy "creator_assets_delete" on public.creator_assets for delete to authenticated
  using (uploaded_by = auth.uid() or public.is_super_admin());

-- creator_availability
drop policy if exists "creator_availability_select" on public.creator_availability;
create policy "creator_availability_select" on public.creator_availability for select to authenticated
  using (true);
drop policy if exists "creator_availability_write" on public.creator_availability;
create policy "creator_availability_write" on public.creator_availability for all to authenticated
  using (true) with check (true);

-- creator_ratings (interne Bewertungen)
drop policy if exists "creator_ratings_select" on public.creator_ratings;
create policy "creator_ratings_select" on public.creator_ratings for select to authenticated
  using (true);
drop policy if exists "creator_ratings_insert" on public.creator_ratings;
create policy "creator_ratings_insert" on public.creator_ratings for insert to authenticated
  with check (created_by = auth.uid());
drop policy if exists "creator_ratings_delete" on public.creator_ratings;
create policy "creator_ratings_delete" on public.creator_ratings for delete to authenticated
  using (created_by = auth.uid() or public.is_super_admin());

-- shoot_assignments (Besetzung)
drop policy if exists "shoot_assignments_select" on public.shoot_assignments;
create policy "shoot_assignments_select" on public.shoot_assignments for select to authenticated
  using (deleted_at is null or public.is_super_admin());
drop policy if exists "shoot_assignments_insert" on public.shoot_assignments;
create policy "shoot_assignments_insert" on public.shoot_assignments for insert to authenticated with check (true);
drop policy if exists "shoot_assignments_update" on public.shoot_assignments;
create policy "shoot_assignments_update" on public.shoot_assignments for update to authenticated
  using (true) with check (true);
drop policy if exists "shoot_assignments_delete" on public.shoot_assignments;
create policy "shoot_assignments_delete" on public.shoot_assignments for delete to authenticated
  using (public.is_super_admin());


-- ============================================================
-- 0008_finance.sql
-- ============================================================
-- ===========================================================================
-- eCreator OS - Phase 8: Finance, Forecasting, MRR & Business Intelligence
-- ---------------------------------------------------------------------------
-- KEIN Buchhaltungs-/MWST-/Lohn-Modul. Fokus: Umsatz, MRR/ARR, Forecast,
-- Kundenwert, Rentabilitaet. Neu: invoices, expenses. MRR/ARR/Forecast werden
-- zur Laufzeit aus Vertraegen (contracts.value_monthly) + Kosten berechnet.
-- Sichtbar nur fuer super_admin / ceo / finance (RLS). Ausfuehren NACH 0007.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Registry: Rechnungs-Status
-- ---------------------------------------------------------------------------
insert into public.statuses (entity_type, key, label, color, sort_order, is_default) values
  ('invoice', 'draft',     'Entwurf',     'gray',  1, true),
  ('invoice', 'open',      'Offen',       'blue',  2, false),
  ('invoice', 'paid',      'Bezahlt',     'green', 3, false),
  ('invoice', 'overdue',   'Ueberfaellig','red',   4, false),
  ('invoice', 'cancelled', 'Storniert',   'gray',  5, false)
on conflict (entity_type, key) do nothing;

-- ---------------------------------------------------------------------------
-- 2. invoices (ausgehende Rechnungen)
-- ---------------------------------------------------------------------------
create table if not exists public.invoices (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null default '11111111-1111-1111-1111-111111111111'
                   references public.organizations (id),
  client_id      uuid references public.clients (id) on delete set null,
  invoice_number text,
  title          text,
  amount         bigint,        -- Nettobetrag in Rappen
  vat            bigint,        -- MWST-Betrag in Rappen (optional)
  due_date       date,
  paid_date      date,
  status         text not null default 'draft',
  pdf_url        text,
  notes          text,
  created_by     uuid references public.profiles (id),
  updated_by     uuid references public.profiles (id),
  deleted_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists invoices_client_idx on public.invoices (client_id);
create index if not exists invoices_status_idx on public.invoices (status);
create index if not exists invoices_due_idx    on public.invoices (due_date);
create index if not exists invoices_paid_idx   on public.invoices (paid_date);

-- ---------------------------------------------------------------------------
-- 3. expenses (betriebliche Kosten)
-- ---------------------------------------------------------------------------
create table if not exists public.expenses (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null default '11111111-1111-1111-1111-111111111111'
                        references public.organizations (id),
  title               text not null,
  category            text,
  amount              bigint,        -- Betrag in Rappen
  recurring           boolean not null default false,
  recurring_frequency text,          -- monthly/quarterly/yearly
  date                date,
  notes               text,
  created_by          uuid references public.profiles (id),
  updated_by          uuid references public.profiles (id),
  deleted_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists expenses_category_idx  on public.expenses (category);
create index if not exists expenses_recurring_idx on public.expenses (recurring);
create index if not exists expenses_date_idx      on public.expenses (date);

-- ===========================================================================
-- 4. Trigger
-- ===========================================================================
drop trigger if exists set_updated_at on public.invoices;
create trigger set_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.expenses;
create trigger set_updated_at before update on public.expenses
  for each row execute function public.set_updated_at();

drop trigger if exists stamp_actor on public.invoices;
create trigger stamp_actor before insert on public.invoices
  for each row execute function public.stamp_actor();
drop trigger if exists invoices_stamp_update on public.invoices;
create trigger invoices_stamp_update before update on public.invoices
  for each row execute function public.tasks_stamp_update();

drop trigger if exists stamp_actor on public.expenses;
create trigger stamp_actor before insert on public.expenses
  for each row execute function public.stamp_actor();
drop trigger if exists expenses_stamp_update on public.expenses;
create trigger expenses_stamp_update before update on public.expenses
  for each row execute function public.tasks_stamp_update();

drop trigger if exists validate_status on public.invoices;
create trigger validate_status before insert or update on public.invoices
  for each row execute function public.validate_status('invoice');

-- ===========================================================================
-- 5. Row Level Security - Finance nur fuer super_admin / ceo / finance
-- ===========================================================================
alter table public.invoices enable row level security;
alter table public.expenses enable row level security;

-- invoices
drop policy if exists "invoices_select" on public.invoices;
create policy "invoices_select" on public.invoices for select to authenticated
  using (
    (deleted_at is null
      and (public.is_super_admin() or public.has_role('ceo') or public.has_role('finance')))
    or public.is_super_admin()
  );
drop policy if exists "invoices_insert" on public.invoices;
create policy "invoices_insert" on public.invoices for insert to authenticated
  with check (public.is_super_admin() or public.has_role('ceo') or public.has_role('finance'));
drop policy if exists "invoices_update" on public.invoices;
create policy "invoices_update" on public.invoices for update to authenticated
  using (public.is_super_admin() or public.has_role('ceo') or public.has_role('finance'))
  with check (public.is_super_admin() or public.has_role('ceo') or public.has_role('finance'));
drop policy if exists "invoices_delete" on public.invoices;
create policy "invoices_delete" on public.invoices for delete to authenticated
  using (public.is_super_admin());

-- expenses
drop policy if exists "expenses_select" on public.expenses;
create policy "expenses_select" on public.expenses for select to authenticated
  using (
    (deleted_at is null
      and (public.is_super_admin() or public.has_role('ceo') or public.has_role('finance')))
    or public.is_super_admin()
  );
drop policy if exists "expenses_insert" on public.expenses;
create policy "expenses_insert" on public.expenses for insert to authenticated
  with check (public.is_super_admin() or public.has_role('ceo') or public.has_role('finance'));
drop policy if exists "expenses_update" on public.expenses;
create policy "expenses_update" on public.expenses for update to authenticated
  using (public.is_super_admin() or public.has_role('ceo') or public.has_role('finance'))
  with check (public.is_super_admin() or public.has_role('ceo') or public.has_role('finance'));
drop policy if exists "expenses_delete" on public.expenses;
create policy "expenses_delete" on public.expenses for delete to authenticated
  using (public.is_super_admin());


-- ============================================================
-- 0009_ai_automation.sql
-- ============================================================
-- ===========================================================================
-- eCreator OS - Phase 9: AI Foundation & Automation Layer
-- ---------------------------------------------------------------------------
-- FUNDAMENT (keine echten Engine-Calls): ai_prompts, ai_runs, automation_jobs,
-- automation_runs, integrations, webhooks. notifications existiert bereits
-- (0003) und wird NICHT dupliziert - nur eine SECURITY-DEFINER-Funktion zum
-- Erstellen von Benachrichtigungen fuer beliebige Nutzer ergaenzt.
-- Sichtbar nur fuer super_admin / ceo / developer (RLS). Credentials werden
-- verschluesselt gespeichert und NIE ans Frontend gegeben. Ausfuehren NACH 0008.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. ai_prompts (zentrale Prompt-Templates, keine hardcoded Prompts)
-- ---------------------------------------------------------------------------
create table if not exists public.ai_prompts (
  id                   uuid primary key default gen_random_uuid(),
  org_id               uuid not null default '11111111-1111-1111-1111-111111111111'
                         references public.organizations (id),
  name                 text not null,
  category             text,
  description          text,
  system_prompt        text,
  user_prompt_template text,
  variables            jsonb not null default '[]'::jsonb,  -- ["company_name", ...]
  model                text,
  temperature          numeric(3,2) not null default 0.70,
  status               text not null default 'active',      -- active/inactive
  created_by           uuid references public.profiles (id),
  updated_by           uuid references public.profiles (id),
  deleted_at           timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists ai_prompts_category_idx on public.ai_prompts (category);
create index if not exists ai_prompts_status_idx   on public.ai_prompts (status);

-- ---------------------------------------------------------------------------
-- 2. ai_runs (Protokoll jedes AI-Laufs)
-- ---------------------------------------------------------------------------
create table if not exists public.ai_runs (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null default '11111111-1111-1111-1111-111111111111'
                  references public.organizations (id),
  prompt_id     uuid references public.ai_prompts (id) on delete set null,
  entity_type   text,
  entity_id     uuid,
  input_data    jsonb,
  output_data   jsonb,
  model         text,
  status        text not null default 'pending',   -- pending/running/success/error/skipped
  error_message text,
  token_usage   integer,
  cost_estimate numeric(10,4),
  created_by    uuid references public.profiles (id),
  created_at    timestamptz not null default now()
);
create index if not exists ai_runs_prompt_idx on public.ai_runs (prompt_id);
create index if not exists ai_runs_status_idx on public.ai_runs (status);
create index if not exists ai_runs_created_idx on public.ai_runs (created_at desc);

-- ---------------------------------------------------------------------------
-- 3. automation_jobs (geplante Jobs - vorbereitet, nicht live)
-- ---------------------------------------------------------------------------
create table if not exists public.automation_jobs (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null default '11111111-1111-1111-1111-111111111111'
                 references public.organizations (id),
  name         text not null,
  type         text,           -- daily_lead_search/website_audit/...
  status       text not null default 'inactive',   -- active/paused/inactive
  schedule     text,           -- daily/weekly/monthly/manual oder Cron
  last_run_at  timestamptz,
  next_run_at  timestamptz,
  config       jsonb not null default '{}'::jsonb,
  created_by   uuid references public.profiles (id),
  updated_by   uuid references public.profiles (id),
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists automation_jobs_status_idx on public.automation_jobs (status);
create index if not exists automation_jobs_type_idx   on public.automation_jobs (type);

-- ---------------------------------------------------------------------------
-- 4. automation_runs (Lauf-Protokoll je Job)
-- ---------------------------------------------------------------------------
create table if not exists public.automation_runs (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null default '11111111-1111-1111-1111-111111111111'
                  references public.organizations (id),
  job_id        uuid not null references public.automation_jobs (id) on delete cascade,
  status        text not null default 'running',   -- running/success/error
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  result        jsonb,
  error_message text,
  logs          text,
  created_at    timestamptz not null default now()
);
create index if not exists automation_runs_job_idx on public.automation_runs (job_id, started_at desc);

-- ---------------------------------------------------------------------------
-- 5. integrations (Drittsysteme - Credentials verschluesselt)
-- ---------------------------------------------------------------------------
create table if not exists public.integrations (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid not null default '11111111-1111-1111-1111-111111111111'
                          references public.organizations (id),
  name                  text not null,
  provider              text,
  status                text not null default 'disconnected', -- connected/disconnected/configured/error
  config                jsonb not null default '{}'::jsonb,
  encrypted_credentials text,   -- NIE ans Frontend ausliefern
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists integrations_provider_idx on public.integrations (provider);

-- ---------------------------------------------------------------------------
-- 6. webhooks
-- ---------------------------------------------------------------------------
create table if not exists public.webhooks (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null default '11111111-1111-1111-1111-111111111111'
                     references public.organizations (id),
  name             text not null,
  provider         text,
  endpoint_url     text,
  status           text not null default 'inactive',
  secret           text,
  last_received_at timestamptz,
  config           jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 7. Notifications: SECURITY-DEFINER-Funktion zum Erstellen fuer beliebige
--    Nutzer (Engines/Automationen). Umgeht die user-scoped Insert-Policy
--    kontrolliert; nur privilegierte Rollen duerfen aufrufen.
-- ---------------------------------------------------------------------------
create or replace function public.create_notification(
  p_user_id     uuid,
  p_type        text,
  p_title       text,
  p_body        text default null,
  p_entity_type text default null,
  p_entity_id   uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not (
    public.is_super_admin()
    or public.has_role('ceo')
    or public.has_role('developer')
    or public.has_role('cso')
  ) then
    raise exception 'Keine Berechtigung, Benachrichtigungen zu erstellen';
  end if;
  insert into public.notifications (user_id, type, title, body, entity_type, entity_id)
  values (p_user_id, p_type, p_title, p_body, p_entity_type, p_entity_id)
  returning id into v_id;
  return v_id;
end;
$$;

-- ===========================================================================
-- 8. Trigger (updated_at + Identitaets-Stempel)
-- ===========================================================================
drop trigger if exists set_updated_at on public.ai_prompts;
create trigger set_updated_at before update on public.ai_prompts
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.automation_jobs;
create trigger set_updated_at before update on public.automation_jobs
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.integrations;
create trigger set_updated_at before update on public.integrations
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.webhooks;
create trigger set_updated_at before update on public.webhooks
  for each row execute function public.set_updated_at();

drop trigger if exists stamp_actor on public.ai_prompts;
create trigger stamp_actor before insert on public.ai_prompts
  for each row execute function public.stamp_actor();
drop trigger if exists ai_prompts_stamp_update on public.ai_prompts;
create trigger ai_prompts_stamp_update before update on public.ai_prompts
  for each row execute function public.tasks_stamp_update();

drop trigger if exists stamp_actor on public.automation_jobs;
create trigger stamp_actor before insert on public.automation_jobs
  for each row execute function public.stamp_actor();
drop trigger if exists automation_jobs_stamp_update on public.automation_jobs;
create trigger automation_jobs_stamp_update before update on public.automation_jobs
  for each row execute function public.tasks_stamp_update();

drop trigger if exists stamp_created_by on public.ai_runs;
create trigger stamp_created_by before insert on public.ai_runs
  for each row execute function public.stamp_created_by_only();

-- ===========================================================================
-- 9. Row Level Security - nur super_admin / ceo / developer
-- ===========================================================================
alter table public.ai_prompts      enable row level security;
alter table public.ai_runs         enable row level security;
alter table public.automation_jobs enable row level security;
alter table public.automation_runs enable row level security;
alter table public.integrations    enable row level security;
alter table public.webhooks        enable row level security;

-- Lese-/Schreibrechte fuer ai_prompts, ai_runs, automation_jobs, automation_runs:
-- super_admin/ceo/developer. (Audit-/Stempel-Trigger erzwingen Identitaet.)
do $$
declare t text;
begin
  foreach t in array array['ai_prompts','ai_runs','automation_jobs','automation_runs']
  loop
    execute format('drop policy if exists "%1$s_all" on public.%1$s;', t);
    execute format($f$
      create policy "%1$s_all" on public.%1$s for all to authenticated
      using (public.is_super_admin() or public.has_role('ceo') or public.has_role('developer'))
      with check (public.is_super_admin() or public.has_role('ceo') or public.has_role('developer'));
    $f$, t);
  end loop;
end $$;

-- integrations & webhooks: lesen super_admin/ceo/developer; schreiben NUR super_admin
-- (sensible Credentials/Secrets).
drop policy if exists "integrations_select" on public.integrations;
create policy "integrations_select" on public.integrations for select to authenticated
  using (public.is_super_admin() or public.has_role('ceo') or public.has_role('developer'));
drop policy if exists "integrations_write" on public.integrations;
create policy "integrations_write" on public.integrations for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "webhooks_select" on public.webhooks;
create policy "webhooks_select" on public.webhooks for select to authenticated
  using (public.is_super_admin() or public.has_role('ceo') or public.has_role('developer'));
drop policy if exists "webhooks_write" on public.webhooks;
create policy "webhooks_write" on public.webhooks for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());


-- ============================================================
-- 0010_lead_engine.sql
-- ============================================================
-- ===========================================================================
-- eCreator OS - Phase 10: Lead Engine & Opportunity Discovery
-- ---------------------------------------------------------------------------
-- Findet Unternehmen, analysiert (Struktur, keine tiefe AI), bewertet
-- Opportunities und speist hochwertige Leads in die Sales-Pipeline (Phase 4)
-- ein. Neu: lead_sources, lead_discovery_runs, lead_companies, lead_opportunities.
-- Nur super_admin/ceo/cso/sales. Ausfuehren NACH 0009.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. lead_sources (modulare Quellen - Architektur vorbereitet)
-- ---------------------------------------------------------------------------
create table if not exists public.lead_sources (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default '11111111-1111-1111-1111-111111111111'
                references public.organizations (id),
  name        text not null,
  source_type text,           -- osm/google_places/manual/csv/web
  status      text not null default 'active',
  config      jsonb not null default '{}'::jsonb,
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. lead_discovery_runs (Lauf-Protokoll je Quelle)
-- ---------------------------------------------------------------------------
create table if not exists public.lead_discovery_runs (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default '11111111-1111-1111-1111-111111111111'
                references public.organizations (id),
  source_id   uuid references public.lead_sources (id) on delete set null,
  status      text not null default 'running',   -- running/success/error
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  leads_found integer not null default 0,
  logs        text,
  created_at  timestamptz not null default now()
);
create index if not exists lead_discovery_runs_source_idx
  on public.lead_discovery_runs (source_id, started_at desc);

-- ---------------------------------------------------------------------------
-- 3. lead_companies (gefundene Firmen - Staging vor Sales-Pipeline)
-- ---------------------------------------------------------------------------
create table if not exists public.lead_companies (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null default '11111111-1111-1111-1111-111111111111'
                        references public.organizations (id),
  name                text not null,
  industry            text,
  website             text,
  domain              text,            -- normalisiert, fuer Dublettenerkennung
  phone               text,
  email               text,
  city                text,
  canton              text,
  country             text,
  contact_name        text,
  source_id           uuid references public.lead_sources (id) on delete set null,
  -- Website-Scan (Struktur, keine tiefe Analyse): has_website, https,
  -- mobile_friendly, load_time_ms, has_contact_form, has_cta, has_social_links,
  -- has_imprint, has_tracking
  website_scan        jsonb not null default '{}'::jsonb,
  website_score       integer not null default 0,
  ads_score           integer not null default 0,
  content_score       integer not null default 0,
  recruiting_score    integer not null default 0,
  crm_score           integer not null default 0,
  overall_score       integer not null default 0,
  watchlist_status    text not null default 'watch',  -- watch/active/not_relevant
  handed_over         boolean not null default false,
  handed_over_lead_id uuid references public.leads (id) on delete set null,
  handed_over_at      timestamptz,
  last_analyzed_at    timestamptz,
  notes               text,
  created_by          uuid references public.profiles (id),
  updated_by          uuid references public.profiles (id),
  deleted_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists lead_companies_domain_idx  on public.lead_companies (domain);
create index if not exists lead_companies_email_idx   on public.lead_companies (email);
create index if not exists lead_companies_score_idx   on public.lead_companies (overall_score desc);
create index if not exists lead_companies_watch_idx   on public.lead_companies (watchlist_status);
create index if not exists lead_companies_canton_idx  on public.lead_companies (canton);
create index if not exists lead_companies_industry_idx on public.lead_companies (industry);

-- ---------------------------------------------------------------------------
-- 4. lead_opportunities (erkannte Chancen je Firma)
-- ---------------------------------------------------------------------------
create table if not exists public.lead_opportunities (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null default '11111111-1111-1111-1111-111111111111'
                     references public.organizations (id),
  lead_company_id  uuid not null references public.lead_companies (id) on delete cascade,
  opportunity_type text,    -- website/ads/content/recruiting/crm/automation/growth
  score            integer not null default 0,
  findings         text,
  recommendations  text,
  created_at       timestamptz not null default now()
);
create index if not exists lead_opportunities_company_idx
  on public.lead_opportunities (lead_company_id);

-- ===========================================================================
-- 5. Trigger
-- ===========================================================================
drop trigger if exists set_updated_at on public.lead_sources;
create trigger set_updated_at before update on public.lead_sources
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.lead_companies;
create trigger set_updated_at before update on public.lead_companies
  for each row execute function public.set_updated_at();

drop trigger if exists stamp_created_by on public.lead_sources;
create trigger stamp_created_by before insert on public.lead_sources
  for each row execute function public.stamp_created_by_only();

drop trigger if exists stamp_actor on public.lead_companies;
create trigger stamp_actor before insert on public.lead_companies
  for each row execute function public.stamp_actor();
drop trigger if exists lead_companies_stamp_update on public.lead_companies;
create trigger lead_companies_stamp_update before update on public.lead_companies
  for each row execute function public.tasks_stamp_update();

-- ===========================================================================
-- 6. Row Level Security - nur super_admin / ceo / cso / sales
-- ===========================================================================
alter table public.lead_sources        enable row level security;
alter table public.lead_discovery_runs enable row level security;
alter table public.lead_companies       enable row level security;
alter table public.lead_opportunities   enable row level security;

do $$
declare t text;
begin
  foreach t in array array['lead_sources','lead_discovery_runs','lead_companies','lead_opportunities']
  loop
    execute format('drop policy if exists "%1$s_all" on public.%1$s;', t);
    execute format($f$
      create policy "%1$s_all" on public.%1$s for all to authenticated
      using (public.is_super_admin() or public.has_role('ceo') or public.has_role('cso') or public.has_role('sales'))
      with check (public.is_super_admin() or public.has_role('ceo') or public.has_role('cso') or public.has_role('sales'));
    $f$, t);
  end loop;
end $$;


-- ============================================================
-- 0011_outreach.sql
-- ============================================================
-- ===========================================================================
-- eCreator OS - Phase 11: Outreach Engine, Follow-Ups & Terminbuchung
-- ---------------------------------------------------------------------------
-- Aus Opportunities echte Gespraeche machen - personalisierte ENTWUERFE,
-- Follow-ups, Antwort-Tracking, Termine. KEIN Blind-Massenversand. Neu:
-- outreach_campaigns, email_templates, outreach_contacts, outreach_messages,
-- follow_up_sequences, booked_meetings, unsubscribes.
-- Nur super_admin/ceo/cso/sales. Ausfuehren NACH 0010.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Registry: Nachrichten- & Termin-Status
-- ---------------------------------------------------------------------------
insert into public.statuses (entity_type, key, label, color, sort_order, is_default) values
  ('outreach_message', 'draft',       'Entwurf',       'gray',  1, true),
  ('outreach_message', 'scheduled',   'Geplant',       'blue',  2, false),
  ('outreach_message', 'sent',        'Gesendet',      'blue',  3, false),
  ('outreach_message', 'opened',      'Geoeffnet',     'amber', 4, false),
  ('outreach_message', 'replied',     'Beantwortet',   'amber', 5, false),
  ('outreach_message', 'positive',    'Positiv',       'green', 6, false),
  ('outreach_message', 'negative',    'Negativ',       'red',   7, false),
  ('outreach_message', 'no_interest', 'Kein Interesse','gray',  8, false),
  ('booked_meeting', 'requested', 'Angefragt',     'amber', 1, true),
  ('booked_meeting', 'confirmed', 'Bestaetigt',    'green', 2, false),
  ('booked_meeting', 'done',      'Durchgefuehrt', 'blue',  3, false),
  ('booked_meeting', 'cancelled', 'Abgesagt',      'red',   4, false)
on conflict (entity_type, key) do nothing;

-- ---------------------------------------------------------------------------
-- 2. outreach_campaigns
-- ---------------------------------------------------------------------------
create table if not exists public.outreach_campaigns (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null default '11111111-1111-1111-1111-111111111111'
                  references public.organizations (id),
  name          text not null,
  campaign_type text,
  status        text not null default 'draft',
  created_by    uuid references public.profiles (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. email_templates
-- ---------------------------------------------------------------------------
create table if not exists public.email_templates (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null default '11111111-1111-1111-1111-111111111111'
               references public.organizations (id),
  name       text not null,
  category   text,
  subject    text,
  body       text,
  variables  jsonb not null default '[]'::jsonb,
  active     boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4. outreach_contacts
-- ---------------------------------------------------------------------------
create table if not exists public.outreach_contacts (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null default '11111111-1111-1111-1111-111111111111'
                      references public.organizations (id),
  lead_id           uuid references public.leads (id) on delete cascade,
  email             text,
  phone             text,
  first_name        text,
  last_name         text,
  status            text not null default 'active',  -- active/unsubscribed/bounced
  last_contacted_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists outreach_contacts_lead_idx on public.outreach_contacts (lead_id);

-- ---------------------------------------------------------------------------
-- 5. outreach_messages
-- ---------------------------------------------------------------------------
create table if not exists public.outreach_messages (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default '11111111-1111-1111-1111-111111111111'
                references public.organizations (id),
  lead_id     uuid references public.leads (id) on delete set null,
  campaign_id uuid references public.outreach_campaigns (id) on delete set null,
  template_id uuid references public.email_templates (id) on delete set null,
  subject     text,
  body        text,
  status      text not null default 'draft',
  sent_at     timestamptz,
  opened_at   timestamptz,
  replied_at  timestamptz,
  created_by  uuid references public.profiles (id),
  updated_by  uuid references public.profiles (id),
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists outreach_messages_lead_idx     on public.outreach_messages (lead_id);
create index if not exists outreach_messages_campaign_idx on public.outreach_messages (campaign_id);
create index if not exists outreach_messages_status_idx   on public.outreach_messages (status);

-- ---------------------------------------------------------------------------
-- 6. follow_up_sequences
-- ---------------------------------------------------------------------------
create table if not exists public.follow_up_sequences (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default '11111111-1111-1111-1111-111111111111'
                references public.organizations (id),
  name        text not null,
  active      boolean not null default true,
  description text,
  steps       jsonb not null default '[]'::jsonb,   -- [{day, label}]
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 7. booked_meetings
-- ---------------------------------------------------------------------------
create table if not exists public.booked_meetings (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null default '11111111-1111-1111-1111-111111111111'
               references public.organizations (id),
  lead_id    uuid references public.leads (id) on delete set null,
  title      text,
  date       timestamptz,
  status     text not null default 'requested',
  source     text,           -- manual/calendly/google
  notes      text,
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists booked_meetings_lead_idx on public.booked_meetings (lead_id);
create index if not exists booked_meetings_date_idx on public.booked_meetings (date);

-- ---------------------------------------------------------------------------
-- 8. unsubscribes (Opt-out - NIE erneut kontaktieren)
-- ---------------------------------------------------------------------------
create table if not exists public.unsubscribes (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null default '11111111-1111-1111-1111-111111111111'
                   references public.organizations (id),
  email          text not null,
  reason         text,
  unsubscribed_at timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  unique (org_id, email)
);
create index if not exists unsubscribes_email_idx on public.unsubscribes (email);

-- ===========================================================================
-- 9. Trigger
-- ===========================================================================
do $$
declare t text;
begin
  foreach t in array array['outreach_campaigns','email_templates','outreach_contacts','outreach_messages','follow_up_sequences','booked_meetings']
  loop
    execute format('drop trigger if exists set_updated_at on public.%1$s;', t);
    execute format('create trigger set_updated_at before update on public.%1$s for each row execute function public.set_updated_at();', t);
  end loop;
end $$;

drop trigger if exists stamp_created_by on public.outreach_campaigns;
create trigger stamp_created_by before insert on public.outreach_campaigns
  for each row execute function public.stamp_created_by_only();
drop trigger if exists stamp_created_by on public.email_templates;
create trigger stamp_created_by before insert on public.email_templates
  for each row execute function public.stamp_created_by_only();
drop trigger if exists stamp_created_by on public.follow_up_sequences;
create trigger stamp_created_by before insert on public.follow_up_sequences
  for each row execute function public.stamp_created_by_only();

drop trigger if exists stamp_actor on public.outreach_messages;
create trigger stamp_actor before insert on public.outreach_messages
  for each row execute function public.stamp_actor();
drop trigger if exists outreach_messages_stamp_update on public.outreach_messages;
create trigger outreach_messages_stamp_update before update on public.outreach_messages
  for each row execute function public.tasks_stamp_update();
drop trigger if exists stamp_actor on public.booked_meetings;
create trigger stamp_actor before insert on public.booked_meetings
  for each row execute function public.stamp_actor();
drop trigger if exists booked_meetings_stamp_update on public.booked_meetings;
create trigger booked_meetings_stamp_update before update on public.booked_meetings
  for each row execute function public.tasks_stamp_update();

drop trigger if exists validate_status on public.outreach_messages;
create trigger validate_status before insert or update on public.outreach_messages
  for each row execute function public.validate_status('outreach_message');
drop trigger if exists validate_status on public.booked_meetings;
create trigger validate_status before insert or update on public.booked_meetings
  for each row execute function public.validate_status('booked_meeting');

-- ===========================================================================
-- 10. Row Level Security - nur super_admin / ceo / cso / sales
-- ===========================================================================
do $$
declare t text;
begin
  foreach t in array array['outreach_campaigns','email_templates','outreach_contacts','outreach_messages','follow_up_sequences','booked_meetings','unsubscribes']
  loop
    execute format('alter table public.%1$s enable row level security;', t);
    execute format('drop policy if exists "%1$s_all" on public.%1$s;', t);
    execute format($f$
      create policy "%1$s_all" on public.%1$s for all to authenticated
      using (public.is_super_admin() or public.has_role('ceo') or public.has_role('cso') or public.has_role('sales'))
      with check (public.is_super_admin() or public.has_role('ceo') or public.has_role('cso') or public.has_role('sales'));
    $f$, t);
  end loop;
end $$;


-- ============================================================
-- 0012_website_audit.sql
-- ============================================================
-- ===========================================================================
-- eCreator OS - Phase 12: Website Audit Engine & Opportunity Reports
-- ---------------------------------------------------------------------------
-- Analysiert Webseiten (Struktur, keine tiefe AI/Live-Fetch), erkennt
-- Schwachstellen und Opportunities und erzeugt Sales-Material. Neu:
-- website_audits, audit_findings, audit_opportunities. Verknuepfung optional
-- mit lead_companies (Phase 10). Nur super_admin/ceo/cso/sales. NACH 0011.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. website_audits
-- ---------------------------------------------------------------------------
create table if not exists public.website_audits (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null default '11111111-1111-1111-1111-111111111111'
                      references public.organizations (id),
  lead_company_id   uuid references public.lead_companies (id) on delete set null,
  url               text,
  status            text not null default 'draft',   -- draft/generated
  design_score      integer not null default 0,
  conversion_score  integer not null default 0,
  seo_score         integer not null default 0,
  trust_score       integer not null default 0,
  performance_score integer not null default 0,
  mobile_score      integer not null default 0,
  content_score     integer not null default 0,
  tracking_score    integer not null default 0,
  overall_score     integer not null default 0,
  executive_summary text,
  top_problems      jsonb not null default '[]'::jsonb,
  quick_wins        jsonb not null default '[]'::jsonb,
  sales_opportunity text,
  generated_at      timestamptz,
  created_by        uuid references public.profiles (id),
  updated_by        uuid references public.profiles (id),
  deleted_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists website_audits_company_idx on public.website_audits (lead_company_id);
create index if not exists website_audits_score_idx   on public.website_audits (overall_score);
create index if not exists website_audits_created_idx on public.website_audits (created_at desc);

-- ---------------------------------------------------------------------------
-- 2. audit_findings
-- ---------------------------------------------------------------------------
create table if not exists public.audit_findings (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null default '11111111-1111-1111-1111-111111111111'
                   references public.organizations (id),
  audit_id       uuid not null references public.website_audits (id) on delete cascade,
  category       text,
  severity       text,    -- critical/high/medium/low
  title          text,
  description    text,
  recommendation text,
  created_at     timestamptz not null default now()
);
create index if not exists audit_findings_audit_idx on public.audit_findings (audit_id);

-- ---------------------------------------------------------------------------
-- 3. audit_opportunities
-- ---------------------------------------------------------------------------
create table if not exists public.audit_opportunities (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null default '11111111-1111-1111-1111-111111111111'
                     references public.organizations (id),
  audit_id         uuid not null references public.website_audits (id) on delete cascade,
  opportunity_type text,
  score            integer not null default 0,
  reason           text,
  recommendation   text,
  created_at       timestamptz not null default now()
);
create index if not exists audit_opportunities_audit_idx on public.audit_opportunities (audit_id);

-- ===========================================================================
-- 4. Trigger
-- ===========================================================================
drop trigger if exists set_updated_at on public.website_audits;
create trigger set_updated_at before update on public.website_audits
  for each row execute function public.set_updated_at();
drop trigger if exists stamp_actor on public.website_audits;
create trigger stamp_actor before insert on public.website_audits
  for each row execute function public.stamp_actor();
drop trigger if exists website_audits_stamp_update on public.website_audits;
create trigger website_audits_stamp_update before update on public.website_audits
  for each row execute function public.tasks_stamp_update();

-- ===========================================================================
-- 5. Row Level Security - nur super_admin / ceo / cso / sales
-- ===========================================================================
do $$
declare t text;
begin
  foreach t in array array['website_audits','audit_findings','audit_opportunities']
  loop
    execute format('alter table public.%1$s enable row level security;', t);
    execute format('drop policy if exists "%1$s_all" on public.%1$s;', t);
    execute format($f$
      create policy "%1$s_all" on public.%1$s for all to authenticated
      using (public.is_super_admin() or public.has_role('ceo') or public.has_role('cso') or public.has_role('sales'))
      with check (public.is_super_admin() or public.has_role('ceo') or public.has_role('cso') or public.has_role('sales'));
    $f$, t);
  end loop;
end $$;


-- ============================================================
-- 0013_proposals.sql
-- ============================================================
-- ===========================================================================
-- eCreator OS - Phase 13: Proposal Engine, Praesentationen, Vertraege & Rechnungen
-- ---------------------------------------------------------------------------
-- Aus Lead/Audit/Opportunity professionelle Verkaufsunterlagen vorbereiten:
-- Offerte, Praesentation, Vertragsentwurf, Rechnungsentwurf. Neu: proposals,
-- proposal_items, pricing_items (Preislogik). Kein Rechtsersatz - Entwuerfe.
-- Erstellen: super_admin/ceo/cso/sales. Preise bearbeiten: super_admin/ceo.
-- Ausfuehren NACH 0012.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Registry: Proposal-Status
-- ---------------------------------------------------------------------------
insert into public.statuses (entity_type, key, label, color, sort_order, is_default) values
  ('proposal', 'draft',    'Entwurf',           'gray',  1, true),
  ('proposal', 'review',   'Bereit zur Pruefung','amber', 2, false),
  ('proposal', 'sent',     'Gesendet',          'blue',  3, false),
  ('proposal', 'accepted', 'Akzeptiert',        'green', 4, false),
  ('proposal', 'rejected', 'Abgelehnt',         'red',   5, false),
  ('proposal', 'archived', 'Archiviert',        'gray',  6, false)
on conflict (entity_type, key) do nothing;

-- ---------------------------------------------------------------------------
-- 2. pricing_items (Preislogik - verwaltbar in Settings)
-- ---------------------------------------------------------------------------
create table if not exists public.pricing_items (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default '11111111-1111-1111-1111-111111111111'
                references public.organizations (id),
  name        text not null,
  category    text,
  unit_price  bigint,        -- Rappen
  recurring   boolean not null default false,
  active      boolean not null default true,
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists pricing_items_category_idx on public.pricing_items (category);

-- ---------------------------------------------------------------------------
-- 3. proposals
-- ---------------------------------------------------------------------------
create table if not exists public.proposals (
  id                      uuid primary key default gen_random_uuid(),
  org_id                  uuid not null default '11111111-1111-1111-1111-111111111111'
                            references public.organizations (id),
  lead_id                 uuid references public.leads (id) on delete set null,
  client_id               uuid references public.clients (id) on delete set null,
  title                   text not null,
  proposal_type           text,
  status                  text not null default 'draft',
  amount                  bigint,   -- Gesamt (Rappen)
  monthly_amount          bigint,   -- monatlich (Rappen)
  setup_fee               bigint,   -- einmalig (Rappen)
  contract_duration_months integer,
  version                 integer not null default 1,
  parent_id               uuid references public.proposals (id) on delete set null,
  -- Offerten-/Vertragsinhalt
  situation               text,
  goal                    text,
  solution                text,
  next_steps              text,
  contract_start_date     date,
  payment_terms           text,
  cancellation_terms      text,
  pdf_url                 text,
  presentation_url        text,
  contract_url            text,
  invoice_id              uuid references public.invoices (id) on delete set null,
  created_by              uuid references public.profiles (id),
  updated_by              uuid references public.profiles (id),
  deleted_at              timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index if not exists proposals_lead_idx   on public.proposals (lead_id);
create index if not exists proposals_client_idx on public.proposals (client_id);
create index if not exists proposals_status_idx on public.proposals (status);
create index if not exists proposals_parent_idx on public.proposals (parent_id);

-- ---------------------------------------------------------------------------
-- 4. proposal_items
-- ---------------------------------------------------------------------------
create table if not exists public.proposal_items (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default '11111111-1111-1111-1111-111111111111'
                references public.organizations (id),
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  title       text not null,
  description text,
  quantity    numeric(10,2) not null default 1,
  unit_price  bigint,        -- Rappen
  total_price bigint,        -- Rappen
  recurring   boolean not null default false,
  category    text,
  order_index integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists proposal_items_proposal_idx on public.proposal_items (proposal_id, order_index);

-- ===========================================================================
-- 5. Trigger
-- ===========================================================================
drop trigger if exists set_updated_at on public.pricing_items;
create trigger set_updated_at before update on public.pricing_items
  for each row execute function public.set_updated_at();
drop trigger if exists stamp_created_by on public.pricing_items;
create trigger stamp_created_by before insert on public.pricing_items
  for each row execute function public.stamp_created_by_only();

drop trigger if exists set_updated_at on public.proposals;
create trigger set_updated_at before update on public.proposals
  for each row execute function public.set_updated_at();
drop trigger if exists stamp_actor on public.proposals;
create trigger stamp_actor before insert on public.proposals
  for each row execute function public.stamp_actor();
drop trigger if exists proposals_stamp_update on public.proposals;
create trigger proposals_stamp_update before update on public.proposals
  for each row execute function public.tasks_stamp_update();
drop trigger if exists validate_status on public.proposals;
create trigger validate_status before insert or update on public.proposals
  for each row execute function public.validate_status('proposal');

-- ===========================================================================
-- 6. Row Level Security
-- ===========================================================================
alter table public.proposals      enable row level security;
alter table public.proposal_items enable row level security;
alter table public.pricing_items  enable row level security;

-- proposals + proposal_items: super_admin/ceo/cso/sales
do $$
declare t text;
begin
  foreach t in array array['proposals','proposal_items']
  loop
    execute format('drop policy if exists "%1$s_all" on public.%1$s;', t);
    execute format($f$
      create policy "%1$s_all" on public.%1$s for all to authenticated
      using (public.is_super_admin() or public.has_role('ceo') or public.has_role('cso') or public.has_role('sales'))
      with check (public.is_super_admin() or public.has_role('ceo') or public.has_role('cso') or public.has_role('sales'));
    $f$, t);
  end loop;
end $$;

-- pricing_items: lesen super_admin/ceo/cso/sales; schreiben NUR super_admin/ceo
drop policy if exists "pricing_items_select" on public.pricing_items;
create policy "pricing_items_select" on public.pricing_items for select to authenticated
  using (public.is_super_admin() or public.has_role('ceo') or public.has_role('cso') or public.has_role('sales'));
drop policy if exists "pricing_items_write" on public.pricing_items;
create policy "pricing_items_write" on public.pricing_items for all to authenticated
  using (public.is_super_admin() or public.has_role('ceo'))
  with check (public.is_super_admin() or public.has_role('ceo'));


-- ============================================================
-- 0014_knowledge.sql
-- ============================================================
-- ===========================================================================
-- eCreator OS - Phase 14: Knowledge Base, Meeting Assistant & SOP Engine
-- ---------------------------------------------------------------------------
-- Wissenszentrale: meetings erweitert (Recording/Transcript/Summary/ToDos),
-- knowledge_articles, sops, prompt_library. Internes Wissen - alle eingeloggten
-- Teammitglieder. Ausfuehren NACH 0013.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. meetings erweitern (Meeting Assistant)
-- ---------------------------------------------------------------------------
alter table public.meetings
  add column if not exists meeting_type  text,
  add column if not exists recording_url text,
  add column if not exists transcript    text,
  add column if not exists summary       text,
  add column if not exists action_items  text;

-- ---------------------------------------------------------------------------
-- 2. knowledge_articles
-- ---------------------------------------------------------------------------
create table if not exists public.knowledge_articles (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null default '11111111-1111-1111-1111-111111111111'
               references public.organizations (id),
  title      text not null,
  content    text,
  category   text,
  tags       text[] not null default '{}',
  status     text not null default 'draft',   -- draft/published
  created_by uuid references public.profiles (id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists knowledge_articles_category_idx on public.knowledge_articles (category);
create index if not exists knowledge_articles_tags_idx on public.knowledge_articles using gin (tags);

-- ---------------------------------------------------------------------------
-- 3. sops (Standard Operating Procedures)
-- ---------------------------------------------------------------------------
create table if not exists public.sops (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null default '11111111-1111-1111-1111-111111111111'
               references public.organizations (id),
  title      text not null,
  category   text,
  steps      jsonb not null default '[]'::jsonb,   -- [{title, description}]
  status     text not null default 'active',       -- draft/active/archived
  created_by uuid references public.profiles (id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sops_category_idx on public.sops (category);

-- ---------------------------------------------------------------------------
-- 4. prompt_library (Referenz-Prompts fuer das Team - kein Engine-System)
-- ---------------------------------------------------------------------------
create table if not exists public.prompt_library (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null default '11111111-1111-1111-1111-111111111111'
               references public.organizations (id),
  title      text not null,
  category   text,
  prompt     text,
  variables  jsonb not null default '[]'::jsonb,
  tags       text[] not null default '{}',
  created_by uuid references public.profiles (id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists prompt_library_category_idx on public.prompt_library (category);
create index if not exists prompt_library_tags_idx on public.prompt_library using gin (tags);

-- ===========================================================================
-- 5. Trigger
-- ===========================================================================
do $$
declare t text;
begin
  foreach t in array array['knowledge_articles','sops','prompt_library']
  loop
    execute format('drop trigger if exists set_updated_at on public.%1$s;', t);
    execute format('create trigger set_updated_at before update on public.%1$s for each row execute function public.set_updated_at();', t);
    execute format('drop trigger if exists stamp_created_by on public.%1$s;', t);
    execute format('create trigger stamp_created_by before insert on public.%1$s for each row execute function public.stamp_created_by_only();', t);
  end loop;
end $$;

-- ===========================================================================
-- 6. Row Level Security - internes Wissen, alle eingeloggten Teammitglieder
-- ===========================================================================
do $$
declare t text;
begin
  foreach t in array array['knowledge_articles','sops','prompt_library']
  loop
    execute format('alter table public.%1$s enable row level security;', t);
    execute format('drop policy if exists "%1$s_select" on public.%1$s;', t);
    execute format('create policy "%1$s_select" on public.%1$s for select to authenticated using (deleted_at is null or public.is_super_admin());', t);
    execute format('drop policy if exists "%1$s_write" on public.%1$s;', t);
    execute format('create policy "%1$s_write" on public.%1$s for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;


-- ============================================================
-- 0015_executive.sql
-- ============================================================
-- ===========================================================================
-- eCreator OS - Phase 15: Executive Command Center & CEO Dashboard
-- ---------------------------------------------------------------------------
-- Management-Fokus: gesamte Firma in 60 Sekunden. Das meiste wird ZUR LAUFZEIT
-- aus bestehenden Modulen (Finance/Sales/Clients/Production) aggregiert.
-- Neu/gespeichert: executive_alerts, company_goals. Nur super_admin/ceo/cso.
-- Ausfuehren NACH 0014.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. executive_alerts (manuell + spaeter automatisch befuellbar)
-- ---------------------------------------------------------------------------
create table if not exists public.executive_alerts (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default '11111111-1111-1111-1111-111111111111'
                references public.organizations (id),
  category    text,    -- revenue/client/contract/project/team/finance/sales
  severity    text,    -- critical/high/medium/info
  title       text not null,
  description text,
  entity_type text,
  entity_id   uuid,
  resolved    boolean not null default false,
  resolved_at timestamptz,
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now()
);
create index if not exists executive_alerts_resolved_idx on public.executive_alerts (resolved, created_at desc);

-- ---------------------------------------------------------------------------
-- 2. company_goals (KPI-Tracking)
-- ---------------------------------------------------------------------------
create table if not exists public.company_goals (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null default '11111111-1111-1111-1111-111111111111'
                  references public.organizations (id),
  title         text not null,
  target_value  numeric,
  current_value numeric not null default 0,
  unit          text,
  due_date      date,
  owner_id      uuid references public.profiles (id) on delete set null,
  created_by    uuid references public.profiles (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ===========================================================================
-- 3. Trigger
-- ===========================================================================
drop trigger if exists set_updated_at on public.company_goals;
create trigger set_updated_at before update on public.company_goals
  for each row execute function public.set_updated_at();
drop trigger if exists stamp_created_by on public.executive_alerts;
create trigger stamp_created_by before insert on public.executive_alerts
  for each row execute function public.stamp_created_by_only();
drop trigger if exists stamp_created_by on public.company_goals;
create trigger stamp_created_by before insert on public.company_goals
  for each row execute function public.stamp_created_by_only();

-- ===========================================================================
-- 4. Row Level Security - nur super_admin / ceo / cso
-- ===========================================================================
do $$
declare t text;
begin
  foreach t in array array['executive_alerts','company_goals']
  loop
    execute format('alter table public.%1$s enable row level security;', t);
    execute format('drop policy if exists "%1$s_all" on public.%1$s;', t);
    execute format($f$
      create policy "%1$s_all" on public.%1$s for all to authenticated
      using (public.is_super_admin() or public.has_role('ceo') or public.has_role('cso'))
      with check (public.is_super_admin() or public.has_role('ceo') or public.has_role('cso'));
    $f$, t);
  end loop;
end $$;


-- ============================================================
-- 0016_growth.sql
-- ============================================================
-- ===========================================================================
-- eCreator OS - Phase 16: Upsell, Referral & Renewal Engine (Revenue Expansion)
-- ---------------------------------------------------------------------------
-- Mehr Umsatz aus bestehenden Kunden - strukturiert und messbar. Neu:
-- upsell_opportunities, referral_opportunities, review_requests, renewals,
-- churn_risks, testimonials. Erkennung/Scoring zur Laufzeit aus Projekten/
-- Vertraegen/Kundenstatus. Nur super_admin/ceo/cso/sales. NACH 0015.
-- ===========================================================================

create extension if not exists pgcrypto;

create table if not exists public.upsell_opportunities (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null default '11111111-1111-1111-1111-111111111111'
                     references public.organizations (id),
  client_id        uuid not null references public.clients (id) on delete cascade,
  opportunity_type text,
  score            integer not null default 0,
  reason           text,
  recommendation   text,
  estimated_value  bigint,        -- Rappen (monatlich)
  status           text not null default 'open',  -- open/in_progress/won/lost/dismissed
  created_by       uuid references public.profiles (id),
  created_at       timestamptz not null default now()
);
create index if not exists upsell_client_idx on public.upsell_opportunities (client_id, status);

create table if not exists public.referral_opportunities (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null default '11111111-1111-1111-1111-111111111111'
               references public.organizations (id),
  client_id  uuid not null references public.clients (id) on delete cascade,
  score      integer not null default 0,
  reason     text,
  status     text not null default 'open',
  created_at timestamptz not null default now()
);
create index if not exists referral_client_idx on public.referral_opportunities (client_id, status);

create table if not exists public.review_requests (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null default '11111111-1111-1111-1111-111111111111'
                 references public.organizations (id),
  client_id    uuid not null references public.clients (id) on delete cascade,
  request_date date,
  status       text not null default 'pending',  -- pending/requested/received/declined
  review_url   text,
  created_at   timestamptz not null default now()
);
create index if not exists review_client_idx on public.review_requests (client_id, status);

create table if not exists public.renewals (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null default '11111111-1111-1111-1111-111111111111'
                        references public.organizations (id),
  contract_id         uuid references public.contracts (id) on delete set null,
  client_id           uuid not null references public.clients (id) on delete cascade,
  renewal_score       integer not null default 0,
  renewal_probability integer not null default 0,
  status              text not null default 'pending',  -- pending/in_progress/renewed/lost
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists renewals_client_idx on public.renewals (client_id, status);

create table if not exists public.churn_risks (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null default '11111111-1111-1111-1111-111111111111'
               references public.organizations (id),
  client_id  uuid not null references public.clients (id) on delete cascade,
  score      integer not null default 0,
  reasons    text,
  created_at timestamptz not null default now()
);
create index if not exists churn_client_idx on public.churn_risks (client_id);

create table if not exists public.testimonials (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null default '11111111-1111-1111-1111-111111111111'
               references public.organizations (id),
  client_id  uuid not null references public.clients (id) on delete cascade,
  type       text,        -- text/video/case_study
  status     text not null default 'requested',  -- requested/in_progress/received/published
  content    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists testimonials_client_idx on public.testimonials (client_id);

-- ===========================================================================
-- Trigger
-- ===========================================================================
drop trigger if exists set_updated_at on public.renewals;
create trigger set_updated_at before update on public.renewals
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.testimonials;
create trigger set_updated_at before update on public.testimonials
  for each row execute function public.set_updated_at();
drop trigger if exists stamp_created_by on public.upsell_opportunities;
create trigger stamp_created_by before insert on public.upsell_opportunities
  for each row execute function public.stamp_created_by_only();

-- ===========================================================================
-- Row Level Security - nur super_admin / ceo / cso / sales
-- ===========================================================================
do $$
declare t text;
begin
  foreach t in array array['upsell_opportunities','referral_opportunities','review_requests','renewals','churn_risks','testimonials']
  loop
    execute format('alter table public.%1$s enable row level security;', t);
    execute format('drop policy if exists "%1$s_all" on public.%1$s;', t);
    execute format($f$
      create policy "%1$s_all" on public.%1$s for all to authenticated
      using (public.is_super_admin() or public.has_role('ceo') or public.has_role('cso') or public.has_role('sales'))
      with check (public.is_super_admin() or public.has_role('ceo') or public.has_role('cso') or public.has_role('sales'));
    $f$, t);
  end loop;
end $$;


-- ============================================================
-- 0017_growth_engine.sql
-- ============================================================
-- ===========================================================================
-- eCreator OS - Phase 17: Autonomous Growth Engine (Orchestrierungsschicht)
-- ---------------------------------------------------------------------------
-- Verbindet alle Module zu einem Funnel: Lead -> Opportunity -> Audit ->
-- Outreach -> Termin -> Proposal -> Vertrag -> Kunde -> Reporting -> Upsell ->
-- Referral -> Verlaengerung. Die Engine FUEHRT NICHT automatisch aus, sondern
-- schlaegt vor, priorisiert, erzeugt Aufgaben/Erinnerungen/Alerts. Mensch bleibt
-- Entscheider. Neu: revenue_journeys, growth_recommendations,
-- automation_orchestrations, growth_alerts. Nur super_admin/ceo/cso. NACH 0016.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Revenue Journey: der Weg eines Lead/Kunden durch den gesamten Funnel.
-- ---------------------------------------------------------------------------
create table if not exists public.revenue_journeys (
  id                      uuid primary key default gen_random_uuid(),
  org_id                  uuid not null default '11111111-1111-1111-1111-111111111111'
                            references public.organizations (id),
  lead_id                 uuid references public.leads (id) on delete set null,
  client_id               uuid references public.clients (id) on delete set null,
  current_stage           text not null default 'discovery',  -- siehe REVENUE_STAGES
  next_recommended_action text,
  estimated_value         bigint,        -- Rappen
  owner_id                uuid references public.profiles (id) on delete set null,
  status                  text not null default 'active',      -- active/won/lost/paused
  created_by              uuid references public.profiles (id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index if not exists revenue_journeys_stage_idx on public.revenue_journeys (current_stage, status);
create index if not exists revenue_journeys_lead_idx on public.revenue_journeys (lead_id);
create index if not exists revenue_journeys_client_idx on public.revenue_journeys (client_id);

-- ---------------------------------------------------------------------------
-- Growth Recommendation: konkrete naechste-beste-Aktion fuer eine Entitaet.
-- ---------------------------------------------------------------------------
create table if not exists public.growth_recommendations (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null default '11111111-1111-1111-1111-111111111111'
                    references public.organizations (id),
  entity_type     text not null,        -- lead/lead_company/client/audit/outreach/meeting/proposal/contract
  entity_id       uuid,
  title           text not null,
  recommendation  text,                 -- naechster bester Schritt
  reason          text,
  priority        text not null default 'medium',  -- critical/high/medium/low
  estimated_value bigint,               -- Rappen
  href            text,                 -- Deep-Link in die App
  status          text not null default 'open',    -- open/done/dismissed/snoozed
  created_by      uuid references public.profiles (id),
  created_at      timestamptz not null default now()
);
create index if not exists growth_recommendations_status_idx on public.growth_recommendations (status, priority);
create index if not exists growth_recommendations_entity_idx on public.growth_recommendations (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Automation Orchestration: deklarative Trigger -> Aktion-Regeln (Vorschlag,
-- keine ungefragte Ausfuehrung von E-Mails/Vertraegen/Rechnungen).
-- ---------------------------------------------------------------------------
create table if not exists public.automation_orchestrations (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default '11111111-1111-1111-1111-111111111111'
                references public.organizations (id),
  name        text not null,
  trigger     text not null,
  action      text not null,
  description text,
  status      text not null default 'active',   -- active/paused/inactive
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists automation_orchestrations_status_idx on public.automation_orchestrations (status);

-- ---------------------------------------------------------------------------
-- Growth Alert: gespeicherte Warnung der Engine (Vertrag laeuft aus, Angebot
-- ohne Antwort, Kunde ohne Kontakt, hohes Churn-Risiko ...).
-- ---------------------------------------------------------------------------
create table if not exists public.growth_alerts (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default '11111111-1111-1111-1111-111111111111'
                references public.organizations (id),
  severity    text not null default 'info',     -- critical/high/medium/info
  title       text not null,
  description text,
  entity_type text,
  entity_id   uuid,
  resolved    boolean not null default false,
  resolved_at timestamptz,
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now()
);
create index if not exists growth_alerts_open_idx on public.growth_alerts (resolved, severity);

-- ===========================================================================
-- Trigger
-- ===========================================================================
drop trigger if exists set_updated_at on public.revenue_journeys;
create trigger set_updated_at before update on public.revenue_journeys
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.automation_orchestrations;
create trigger set_updated_at before update on public.automation_orchestrations
  for each row execute function public.set_updated_at();

drop trigger if exists stamp_created_by on public.revenue_journeys;
create trigger stamp_created_by before insert on public.revenue_journeys
  for each row execute function public.stamp_created_by_only();
drop trigger if exists stamp_created_by on public.growth_recommendations;
create trigger stamp_created_by before insert on public.growth_recommendations
  for each row execute function public.stamp_created_by_only();
drop trigger if exists stamp_created_by on public.automation_orchestrations;
create trigger stamp_created_by before insert on public.automation_orchestrations
  for each row execute function public.stamp_created_by_only();
drop trigger if exists stamp_created_by on public.growth_alerts;
create trigger stamp_created_by before insert on public.growth_alerts
  for each row execute function public.stamp_created_by_only();

-- ===========================================================================
-- Seed: Standard-Orchestrierungsregeln (idempotent ueber name). Diese sind
-- Vorschlags-Regeln; die Ausfuehrung bleibt menschlich bestaetigt.
-- ===========================================================================
insert into public.automation_orchestrations (name, trigger, action, description, status)
select v.name, v.trigger, v.action, v.description, 'active'
from (values
  ('Lead -> Audit',        'Lead erstellt',              'Website-Audit empfehlen',   'Neuer Lead ohne Audit: Audit-Empfehlung erzeugen.'),
  ('Proposal -> Onboarding','Proposal akzeptiert',       'Onboarding starten',        'Angenommenes Angebot: Onboarding-Aufgaben empfehlen.'),
  ('Kunde -> Review',      'Kunde 60 Tage aktiv',        'Bewertung empfehlen',       'Zufriedener Bestandskunde: Review-Anfrage empfehlen.'),
  ('Vertrag -> Renewal',   'Vertrag 90 Tage vor Ende',   'Verlaengerung empfehlen',   'Auslaufender Vertrag: Renewal-Empfehlung erzeugen.')
) as v(name, trigger, action, description)
where not exists (
  select 1 from public.automation_orchestrations o where o.name = v.name
);

-- ===========================================================================
-- Row Level Security - nur super_admin / ceo / cso (Orchestrierungsschicht).
-- ===========================================================================
do $$
declare t text;
begin
  foreach t in array array['revenue_journeys','growth_recommendations','automation_orchestrations','growth_alerts']
  loop
    execute format('alter table public.%1$s enable row level security;', t);
    execute format('drop policy if exists "%1$s_all" on public.%1$s;', t);
    execute format($f$
      create policy "%1$s_all" on public.%1$s for all to authenticated
      using (public.is_super_admin() or public.has_role('ceo') or public.has_role('cso'))
      with check (public.is_super_admin() or public.has_role('ceo') or public.has_role('cso'));
    $f$, t);
  end loop;
end $$;
