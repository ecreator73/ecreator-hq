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
