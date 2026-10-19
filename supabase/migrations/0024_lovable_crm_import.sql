-- ===========================================================================
-- eCreator OS - Uebernahme des Lovable-CRM (crm.ecreator.ch), Stufe 1
-- ---------------------------------------------------------------------------
-- Entscheid 19.10.2026: eCreator OS uebernimmt Daten und Struktur des
-- Lovable-CRM; Lovable laeuft parallel bis zur Umstellung (Delta-Import).
--
--  1. legacy_lovable_records: Archiv JEDES Lovable-Datensatzes (Tabelle, ID,
--     Rohdaten). Nichts geht verloren; spaetere Stufen und der Delta-Import
--     lesen von hier. Nur Leitung.
--  2. Lead-Status «Massenmail» (in Lovable 97 Leads).
--  3. legacy_id auf sales_activities / tasks / meetings (idempotenter Import).
--  4. client_leads: Leads der Kunden-Kampagnen (Lovable external_leads),
--     getrennt von der eigenen Sales-Pipeline, Status normalisiert + Original.
--
-- Im Supabase SQL-Editor ausfuehren. Idempotent. NACH 0023. Loescht nichts.
-- ===========================================================================

-- 1. Archiv -----------------------------------------------------------------
create table if not exists public.legacy_lovable_records (
  source_table      text not null,
  legacy_id         text not null,
  data              jsonb not null,
  legacy_created_at timestamptz,
  legacy_updated_at timestamptz,
  imported_at       timestamptz not null default now(),
  primary key (source_table, legacy_id)
);
create index if not exists legacy_lovable_created_idx on public.legacy_lovable_records (source_table, legacy_created_at desc);
alter table public.legacy_lovable_records enable row level security;
drop policy if exists "legacy_lovable_select" on public.legacy_lovable_records;
create policy "legacy_lovable_select" on public.legacy_lovable_records for select to authenticated
  using (public.is_super_admin() or public.has_role('ceo'));

-- 2. Lead-Status Massenmail --------------------------------------------------
insert into public.statuses (entity_type, key, label, color, sort_order, is_default)
values ('lead', 'massenmail', 'Massenmail', 'gray', 12, false)
on conflict (entity_type, key) do nothing;

-- 3. Idempotenz-Schluessel fuer den Import ------------------------------------
alter table public.leads             add column if not exists ad_consent boolean;
alter table public.sales_activities  add column if not exists legacy_id text;
alter table public.sales_activities  add column if not exists author_name text;
alter table public.tasks             add column if not exists legacy_id text;
alter table public.meetings          add column if not exists legacy_id text;
create unique index if not exists sales_activities_legacy_key on public.sales_activities (legacy_id) where legacy_id is not null;
create unique index if not exists tasks_legacy_key            on public.tasks (legacy_id)            where legacy_id is not null;
create unique index if not exists meetings_legacy_key         on public.meetings (legacy_id)         where legacy_id is not null;
create index if not exists sales_activities_date_idx on public.sales_activities (activity_date desc);

-- 4. Kunden-Leads (Leads der Kampagnen fuer Kunden) ----------------------------
create table if not exists public.client_leads (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null default '11111111-1111-1111-1111-111111111111'
                   references public.organizations (id),
  legacy_id      text unique,
  client_id      uuid references public.clients (id) on delete set null,
  external_client_name text,
  name           text,
  email          text,
  phone          text,
  source         text,
  status         text not null default 'neu',   -- normalisiert
  status_raw     text,                           -- Originalwert aus dem Kunden-CRM
  campaign_name  text,
  zip_code       text,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  synced_at      timestamptz
);
create index if not exists client_leads_client_idx  on public.client_leads (client_id, created_at desc);
create index if not exists client_leads_status_idx  on public.client_leads (status);
create index if not exists client_leads_created_idx on public.client_leads (created_at desc);
alter table public.client_leads enable row level security;
drop policy if exists "client_leads_select" on public.client_leads;
create policy "client_leads_select" on public.client_leads for select to authenticated
  using (public.is_super_admin() or public.has_role('ceo') or public.has_role('cso') or public.has_role('project_manager'));
drop trigger if exists set_updated_at on public.client_leads;
create trigger set_updated_at before update on public.client_leads
  for each row execute function public.set_updated_at();
