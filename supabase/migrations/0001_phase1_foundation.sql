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
