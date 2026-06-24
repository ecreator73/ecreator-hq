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
