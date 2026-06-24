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
