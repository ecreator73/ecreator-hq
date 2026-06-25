-- ===========================================================================
-- eCreator OS - Import alter CRM-Leads: zusaetzliche Spalten auf public.leads
-- ---------------------------------------------------------------------------
-- Bewahrt ALLE Altdaten: Originalstatus (legacy_status), legacy_id, Zuweisung
-- als Text und die vollstaendige metadata als JSONB. Die Lead-STATUS wurden
-- bereits per Skript auf das normalisierte Set umgestellt (siehe catalog.ts).
-- Im Supabase SQL-Editor ausfuehren (DDL). Idempotent.
-- ===========================================================================

alter table public.leads
  add column if not exists legacy_id          text,
  add column if not exists legacy_status      text,
  add column if not exists assigned_to_name   text,
  add column if not exists assigned_to_email  text,
  add column if not exists campaign_name      text,
  add column if not exists dienstleistung     text,
  add column if not exists metadata_json      jsonb;

-- Dubletten-Schutz + Filter-Performance
create unique index if not exists leads_legacy_id_key
  on public.leads (legacy_id) where legacy_id is not null;
create index if not exists leads_campaign_idx on public.leads (campaign_name);
create index if not exists leads_source_idx   on public.leads (source);
create index if not exists leads_dienst_idx   on public.leads (dienstleistung);
