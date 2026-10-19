-- ===========================================================================
-- eCreator OS - Kundenbereich auf Lovable-Stand (Stufe 2 der CRM-Uebernahme)
-- ---------------------------------------------------------------------------
--  clients            + Ansprechpartner, Paket-/Vertragszahlen (Rappen),
--                       Rechnungsadresse, Links, Status-Zuordnung Kunden-Leads
--  contracts          + Vertragsnummer, Laufzeit, Verlaengerung, Rechnungstag,
--                       Zahlungsfrist, Kuendigung, Unterschrift (Lovable)
--  reporting_calls    + Titel, Zeitraum, erledigt am, Kennzahlen (jsonb)
--  client_onboarding_submissions  Einsendungen des Onboarding-Formulars
--  pricing_items      + Beschreibung, Einheit, «auf Anfrage», Paket, Reihenfolge
--  legacy_id ueberall fuer den idempotenten Import aus Lovable.
-- Im Supabase SQL-Editor ausfuehren. Idempotent. NACH 0025. Loescht nichts.
-- ===========================================================================

-- 1. clients ----------------------------------------------------------------
alter table public.clients
  add column if not exists legacy_id              text,
  add column if not exists contact_name           text,
  add column if not exists monthly_gross          bigint,   -- Rappen, Brutto pro Monat
  add column if not exists monthly_commission     bigint,   -- Rappen, Provision pro Monat
  add column if not exists setup_fee              bigint,   -- Rappen
  add column if not exists contract_start_date    date,
  add column if not exists contract_end_date      date,
  add column if not exists contract_duration      text,
  add column if not exists minimum_term_months    integer,
  add column if not exists cancellation_notice    text,
  add column if not exists financial_notes        text,
  add column if not exists zip_code               text,
  add column if not exists contact_birthday       date,
  add column if not exists uid                    text,
  add column if not exists logo_url               text,
  add column if not exists instagram_url          text,
  add column if not exists facebook_url           text,
  add column if not exists drive_url              text,
  add column if not exists billing_name           text,
  add column if not exists billing_contact        text,
  add column if not exists billing_address        text,
  add column if not exists billing_zip            text,
  add column if not exists billing_city           text,
  add column if not exists billing_email          text,
  add column if not exists billing_email_cc       text,
  add column if not exists reporting_status_map   jsonb not null default '{}'::jsonb,
  add column if not exists external_client_ids    text[] not null default '{}',
  add column if not exists lead_id                uuid references public.leads (id) on delete set null;
create unique index if not exists clients_legacy_key on public.clients (legacy_id) where legacy_id is not null;

-- 2. contracts ----------------------------------------------------------------
alter table public.contracts
  add column if not exists legacy_id        text,
  add column if not exists contract_number  text,
  add column if not exists duration_months  integer,
  add column if not exists renewal_months   integer,
  add column if not exists auto_renew       boolean not null default false,
  add column if not exists billing_day      integer,
  add column if not exists payment_days     integer,
  add column if not exists payment_terms    text,
  add column if not exists cancelled_at     timestamptz,
  add column if not exists signed_at        timestamptz,
  add column if not exists signed_name      text,
  add column if not exists sent_at          timestamptz,
  add column if not exists notes            text;
create unique index if not exists contracts_legacy_key on public.contracts (legacy_id) where legacy_id is not null;

-- 3. reporting_calls ----------------------------------------------------------
alter table public.reporting_calls
  add column if not exists legacy_id    text,
  add column if not exists title        text,
  add column if not exists period_from  date,
  add column if not exists period_to    date,
  add column if not exists done_at      timestamptz,
  add column if not exists metrics      jsonb,
  add column if not exists auto_metrics jsonb,
  add column if not exists ai_texts     jsonb;
create unique index if not exists reporting_calls_legacy_key on public.reporting_calls (legacy_id) where legacy_id is not null;

-- 4. Onboarding-Einsendungen --------------------------------------------------
create table if not exists public.client_onboarding_submissions (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null default '11111111-1111-1111-1111-111111111111'
                       references public.organizations (id),
  legacy_id          text unique,
  client_id          uuid references public.clients (id) on delete set null,
  status             text not null default 'open',      -- open / closed
  company            text,
  name               text,
  email              text,
  phone              text,
  address            text,
  zip_code           text,
  city               text,
  website            text,
  industry           text,
  region             text,
  monthly_ad_budget  text,
  services           text[] not null default '{}',
  answers            jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists onboarding_submissions_created_idx on public.client_onboarding_submissions (created_at desc);
alter table public.client_onboarding_submissions enable row level security;
drop policy if exists "onboarding_submissions_rw" on public.client_onboarding_submissions;
create policy "onboarding_submissions_rw" on public.client_onboarding_submissions for all to authenticated
  using (public.is_super_admin() or public.has_role('ceo') or public.has_role('cso') or public.has_role('project_manager'))
  with check (public.is_super_admin() or public.has_role('ceo') or public.has_role('cso') or public.has_role('project_manager'));
drop trigger if exists set_updated_at on public.client_onboarding_submissions;
create trigger set_updated_at before update on public.client_onboarding_submissions
  for each row execute function public.set_updated_at();

-- 5. Produkte -----------------------------------------------------------------
alter table public.pricing_items
  add column if not exists legacy_id        text,
  add column if not exists description      text,
  add column if not exists unit             text,
  add column if not exists price_on_request boolean not null default false,
  add column if not exists package          text,
  add column if not exists sort_order       integer not null default 0;
create unique index if not exists pricing_items_legacy_key on public.pricing_items (legacy_id) where legacy_id is not null;

-- 6. Kundenkontakt aus Lovable-Verlauf -----------------------------------------
alter table public.client_interactions add column if not exists legacy_id text;
create unique index if not exists client_interactions_legacy_key on public.client_interactions (legacy_id) where legacy_id is not null;

-- 7. Kunden-Leads: Status-Gruppen wie im Lovable-Reporting ---------------------
--    neu / unreachable / mail / hot / won / no_interest / wrong
create index if not exists client_leads_status_client_idx on public.client_leads (client_id, status);
