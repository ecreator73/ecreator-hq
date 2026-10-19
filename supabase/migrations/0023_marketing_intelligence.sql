-- ===========================================================================
-- eCreator OS - Marketing Intelligence (Dashboard «Marketing»)
-- ---------------------------------------------------------------------------
-- Entscheidung 19.10.2026: eCreator OS ist das Lead-Hauptsystem. Website-Leads
-- landen in den BESTEHENDEN Tabellen leads/contacts (erweitert), keine Kopie.
--
--   contacts            Person (auch ohne Kunde), normalisierte E-Mail/Telefon
--   leads               + Kontakt, Formular, First/Last Touch, Klick-IDs,
--                         Attributions-Sicherheit, Idempotenz-Schluessel
--   mi_conversion_events  jede einzelne Absendung/Buchung (nie loeschen,
--                         Wiederholungsanfragen bleiben eigene Ereignisse)
--   mi_bookings         Calendly-Termine (aktiv/abgesagt/verschoben)
--   mi_activity_log     Live-Aktivitaet (nur echte First-Party-Ereignisse,
--                         Statuswechsel, Integrations-/Tracking-Fehler)
--   mi_sync_runs        Abgleich-Laeufe (Frische, Fehler, Zeilen)
--   mi_daily_channel_metrics / mi_daily_ad_metrics / mi_daily_keyword_metrics
--                       Google Ads / Meta Ads je Tag (Kosten in Micros)
--   mi_ga4_daily_totals / mi_ga4_daily_traffic / mi_ga4_daily_pages
--   mi_gsc_daily_totals / mi_gsc_daily
--
-- Zugangsdaten der Integrationen: bestehende Tabelle ad_integrations
-- (provider 'google', 'calendly', 'meta_ads'), Tokens nur verschluesselt.
--
-- Drei Zaehlweisen bleiben getrennt: Plattform-Conversions (Google/Meta),
-- Website-Leads (mi_conversion_events), CRM-Ergebnis (leads.status_id).
--
-- Im Supabase SQL-Editor ausfuehren (DDL). Idempotent. NACH 0022.
-- Loescht KEINE Daten.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. contacts: Personen ohne Kunde zulassen (Website-Interessenten)
-- ---------------------------------------------------------------------------
alter table public.contacts alter column client_id drop not null;
alter table public.contacts
  add column if not exists email_norm   text,
  add column if not exists phone_norm   text,
  add column if not exists company_name text,
  add column if not exists source       text;

update public.contacts
   set email_norm = lower(trim(email))
 where email is not null and trim(email) <> '' and email_norm is null;

create index if not exists contacts_email_norm_idx on public.contacts (email_norm);
create index if not exists contacts_phone_norm_idx on public.contacts (phone_norm);
-- Deterministisches Matching: hoechstens EIN kundenloser Kontakt pro E-Mail.
create unique index if not exists contacts_free_email_key
  on public.contacts (email_norm)
  where client_id is null and email_norm is not null and deleted_at is null;

-- ---------------------------------------------------------------------------
-- 2. leads: Kontakt, Formular, Attribution, Idempotenz
-- ---------------------------------------------------------------------------
alter table public.leads
  add column if not exists contact_id             uuid references public.contacts (id) on delete set null,
  add column if not exists idempotency_key        text,
  add column if not exists form_type              text,      -- kontakt/rueckruf/growth-check/strategie-call/calendly
  add column if not exists message                text,
  add column if not exists conversion_page        text,
  add column if not exists converted_at           timestamptz,
  -- First Touch (erste Beruehrung der Sitzung, die zur ersten Anfrage fuehrte)
  add column if not exists ft_source              text,
  add column if not exists ft_medium              text,
  add column if not exists ft_campaign            text,
  add column if not exists ft_content             text,
  add column if not exists ft_term                text,
  add column if not exists ft_landing_page        text,
  add column if not exists ft_referrer            text,
  add column if not exists ft_at                  timestamptz,
  add column if not exists ft_channel             text,
  -- Last Touch (Attribution der juengsten Anfrage)
  add column if not exists lt_source              text,
  add column if not exists lt_medium              text,
  add column if not exists lt_campaign            text,
  add column if not exists lt_landing_page        text,
  add column if not exists lt_channel             text,
  add column if not exists lt_at                  timestamptz,
  -- Klick-Kennungen (nur gespeichert, wenn die Website sie mitliefert)
  add column if not exists gclid                  text,
  add column if not exists gbraid                 text,
  add column if not exists wbraid                 text,
  add column if not exists fbclid                 text,
  add column if not exists msclkid                text,
  add column if not exists ttclid                 text,
  add column if not exists li_fat_id              text,
  add column if not exists consent_status         text,      -- unknown/granted/denied
  add column if not exists attribution_confidence text;      -- utm_verified/booking_data/derived/unknown

create unique index if not exists leads_idempotency_key
  on public.leads (idempotency_key) where idempotency_key is not null;
create index if not exists leads_contact_idx    on public.leads (contact_id);
create index if not exists leads_ft_channel_idx on public.leads (ft_channel);
create index if not exists leads_created_idx    on public.leads (created_at desc);
create index if not exists leads_email_lower_idx on public.leads (lower(email));

-- ---------------------------------------------------------------------------
-- 3. Calendly-Buchungen
-- ---------------------------------------------------------------------------
create table if not exists public.mi_bookings (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid not null default '11111111-1111-1111-1111-111111111111'
                          references public.organizations (id),
  calendly_invitee_uri  text not null,
  calendly_event_uri    text,
  event_type_uri        text,
  event_name            text,
  invitee_name          text,
  invitee_email         text,
  status                text not null default 'active',   -- active/canceled/rescheduled
  booked_at             timestamptz,                       -- Zeitpunkt der Buchung
  start_time            timestamptz,
  end_time              timestamptz,
  canceled_at           timestamptz,
  cancel_reason         text,
  canceler_type         text,
  rescheduled           boolean not null default false,
  old_invitee_uri       text,                              -- Buchung, die hiermit verschoben wurde
  new_invitee_uri       text,                              -- Ersatztermin, falls verschoben
  utm_source            text,
  utm_medium            text,
  utm_campaign          text,
  utm_content           text,
  utm_term              text,
  landing_page          text,
  page_url              text,
  channel               text,
  attribution_status    text not null default 'unattributed', -- attributed/partial/unattributed
  received_via          text[] not null default '{}',       -- website / webhook
  lead_id               uuid references public.leads (id) on delete set null,
  contact_id            uuid references public.contacts (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (calendly_invitee_uri)
);
create index if not exists mi_bookings_start_idx  on public.mi_bookings (start_time desc);
create index if not exists mi_bookings_booked_idx on public.mi_bookings (booked_at desc);
create index if not exists mi_bookings_lead_idx   on public.mi_bookings (lead_id);
create index if not exists mi_bookings_event_idx  on public.mi_bookings (calendly_event_uri);

-- ---------------------------------------------------------------------------
-- 4. Conversion-Ereignisse (jede Absendung / Buchung)
-- ---------------------------------------------------------------------------
create table if not exists public.mi_conversion_events (
  id                     uuid primary key default gen_random_uuid(),
  org_id                 uuid not null default '11111111-1111-1111-1111-111111111111'
                           references public.organizations (id),
  occurred_at            timestamptz not null,
  received_at            timestamptz not null default now(),
  kind                   text not null,            -- form / booking
  form_type              text,                     -- kontakt/rueckruf/growth-check/strategie-call/calendly
  form_name              text,
  dedupe_key             text not null,            -- Website-Lead-ID bzw. calendly:<invitee>
  external_id            text,                     -- Website-Lead-ID (kt_/rr_/gc_/sc_)
  fingerprint            text,                     -- Inhalts-Hash fuer Doppelklick-Erkennung
  is_duplicate           boolean not null default false,
  lead_id                uuid references public.leads (id) on delete set null,
  contact_id             uuid references public.contacts (id) on delete set null,
  booking_id             uuid references public.mi_bookings (id) on delete set null,
  service                text,
  page_url               text,                     -- Conversion-Seite
  landing_page           text,
  referrer               text,
  first_seen_at          timestamptz,
  utm_source             text,
  utm_medium             text,
  utm_campaign           text,
  utm_content            text,
  utm_term               text,
  gclid                  text,
  gbraid                 text,
  wbraid                 text,
  fbclid                 text,
  msclkid                text,
  ttclid                 text,
  li_fat_id              text,
  channel                text not null default 'unknown',
  attribution_confidence text not null default 'unknown',
  consent_status         text not null default 'unknown',
  details                jsonb,                    -- Formularangaben OHNE Kontaktdaten
  unique (dedupe_key)
);
create index if not exists mi_conv_occurred_idx    on public.mi_conversion_events (occurred_at desc);
create index if not exists mi_conv_lead_idx        on public.mi_conversion_events (lead_id);
create index if not exists mi_conv_channel_idx     on public.mi_conversion_events (channel, occurred_at desc);
create index if not exists mi_conv_fingerprint_idx on public.mi_conversion_events (fingerprint, occurred_at desc);
create index if not exists mi_conv_landing_idx     on public.mi_conversion_events (landing_page);

-- ---------------------------------------------------------------------------
-- 5. Live-Aktivitaet
-- ---------------------------------------------------------------------------
create table if not exists public.mi_activity_log (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default '11111111-1111-1111-1111-111111111111'
                references public.organizations (id),
  occurred_at timestamptz not null default now(),
  type        text not null,     -- lead_created/lead_repeat/duplicate_blocked/booking_created/booking_canceled/
                                 -- booking_rescheduled/status_changed/integration_error/webhook_rejected/sync_ok
  severity    text not null default 'info',   -- info/warning/error
  source      text,              -- website/calendly/google_ads/ga4/gsc/meta_ads/crm
  title       text not null,
  detail      text,              -- ohne Personendaten bei Fehlern
  lead_id     uuid references public.leads (id) on delete set null,
  booking_id  uuid references public.mi_bookings (id) on delete set null,
  campaign    text,
  status      text
);
create index if not exists mi_activity_occurred_idx on public.mi_activity_log (occurred_at desc);
create index if not exists mi_activity_type_idx     on public.mi_activity_log (type, occurred_at desc);

-- ---------------------------------------------------------------------------
-- 6. Abgleich-Laeufe
-- ---------------------------------------------------------------------------
create table if not exists public.mi_sync_runs (
  id            uuid primary key default gen_random_uuid(),
  provider      text not null,           -- ga4/google_ads/gsc/meta_ads/calendly
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  status        text not null default 'running',  -- running/ok/partial/error/skipped
  date_from     date,
  date_to       date,
  rows_upserted integer not null default 0,
  error         text,
  triggered_by  text not null default 'cron'      -- cron/manual
);
create index if not exists mi_sync_runs_provider_idx on public.mi_sync_runs (provider, started_at desc);

-- ---------------------------------------------------------------------------
-- 7. Werbeplattformen je Tag (Kosten in Micros der Kontowaehrung)
-- ---------------------------------------------------------------------------
create table if not exists public.mi_daily_channel_metrics (
  date                 date not null,
  platform             text not null,    -- google_ads / meta_ads
  account_id           text not null,
  campaign_id          text not null,
  campaign_name        text,
  campaign_status      text,
  campaign_type        text,             -- Google: advertising_channel_type, Meta: objective
  budget_micros        bigint,           -- Tagesbudget laut Plattform (falls vorhanden)
  currency             text not null default 'CHF',
  impressions          bigint not null default 0,
  clicks               bigint not null default 0,
  link_clicks          bigint,
  reach                bigint,
  cost_micros          bigint not null default 0,
  platform_conversions numeric(14,2) not null default 0,
  platform_leads       numeric(14,2),
  conversion_value     numeric(14,2),
  synced_at            timestamptz not null default now(),
  primary key (date, platform, account_id, campaign_id)
);
create index if not exists mi_dcm_campaign_idx on public.mi_daily_channel_metrics (platform, campaign_id);

create table if not exists public.mi_daily_ad_metrics (
  date                 date not null,
  platform             text not null,
  account_id           text not null,
  campaign_id          text not null,
  ad_group_id          text not null,    -- Google: ad_group, Meta: adset
  ad_group_name        text,
  ad_id                text not null,
  ad_name              text,
  ad_type              text,
  currency             text not null default 'CHF',
  impressions          bigint not null default 0,
  clicks               bigint not null default 0,
  link_clicks          bigint,
  reach                bigint,
  cost_micros          bigint not null default 0,
  platform_conversions numeric(14,2) not null default 0,
  platform_leads       numeric(14,2),
  synced_at            timestamptz not null default now(),
  primary key (date, platform, account_id, ad_id)
);
create index if not exists mi_dam_campaign_idx on public.mi_daily_ad_metrics (platform, campaign_id);

create table if not exists public.mi_daily_keyword_metrics (
  date                 date not null,
  account_id           text not null,
  campaign_id          text not null,
  campaign_name        text,
  ad_group_id          text not null,
  ad_group_name        text,
  criterion_id         text not null,
  keyword_text         text,
  match_type           text,
  currency             text not null default 'CHF',
  impressions          bigint not null default 0,
  clicks               bigint not null default 0,
  cost_micros          bigint not null default 0,
  platform_conversions numeric(14,2) not null default 0,
  synced_at            timestamptz not null default now(),
  primary key (date, account_id, ad_group_id, criterion_id)
);

-- ---------------------------------------------------------------------------
-- 8. GA4 (Nutzer sind NICHT ueber Dimensionen summierbar -> eigene Totals)
-- ---------------------------------------------------------------------------
create table if not exists public.mi_ga4_daily_totals (
  date              date not null,
  property_id       text not null,
  total_users       bigint not null default 0,
  new_users         bigint not null default 0,
  active_users      bigint not null default 0,
  sessions          bigint not null default 0,
  engaged_sessions  bigint not null default 0,
  screen_page_views bigint not null default 0,
  key_events        numeric(14,2) not null default 0,
  synced_at         timestamptz not null default now(),
  primary key (date, property_id)
);

create table if not exists public.mi_ga4_daily_traffic (
  date             date not null,
  property_id      text not null,
  channel_group    text not null default '',
  source           text not null default '',
  medium           text not null default '',
  campaign         text not null default '',
  landing_page     text not null default '',
  device_category  text not null default '',
  total_users      bigint not null default 0,
  new_users        bigint not null default 0,
  sessions         bigint not null default 0,
  engaged_sessions bigint not null default 0,
  key_events       numeric(14,2) not null default 0,
  synced_at        timestamptz not null default now(),
  primary key (date, property_id, channel_group, source, medium, campaign, landing_page, device_category)
);
create index if not exists mi_ga4_traffic_landing_idx on public.mi_ga4_daily_traffic (landing_page);

create table if not exists public.mi_ga4_daily_pages (
  date                date not null,
  property_id         text not null,
  page_path           text not null,
  page_title          text,
  screen_page_views   bigint not null default 0,
  total_users         bigint not null default 0,
  user_engagement_sec numeric(14,2) not null default 0,
  key_events          numeric(14,2) not null default 0,
  synced_at           timestamptz not null default now(),
  primary key (date, property_id, page_path)
);

-- ---------------------------------------------------------------------------
-- 9. Search Console (anonymisierte Suchanfragen fehlen in den Detailzeilen
--    -> Totals separat, sonst waeren die Summen zu tief)
-- ---------------------------------------------------------------------------
create table if not exists public.mi_gsc_daily_totals (
  date        date not null,
  site_url    text not null,
  clicks      bigint not null default 0,
  impressions bigint not null default 0,
  ctr         numeric(8,5) not null default 0,
  position    numeric(8,2) not null default 0,
  synced_at   timestamptz not null default now(),
  primary key (date, site_url)
);

create table if not exists public.mi_gsc_daily (
  date        date not null,
  site_url    text not null,
  page        text not null,
  query       text not null,
  clicks      bigint not null default 0,
  impressions bigint not null default 0,
  ctr         numeric(8,5) not null default 0,
  position    numeric(8,2) not null default 0,
  synced_at   timestamptz not null default now(),
  primary key (date, site_url, page, query)
);

-- ---------------------------------------------------------------------------
-- 10. Trigger
-- ---------------------------------------------------------------------------
drop trigger if exists set_updated_at on public.mi_bookings;
create trigger set_updated_at before update on public.mi_bookings
  for each row execute function public.set_updated_at();

-- Statuswechsel eines Leads -> Live-Aktivitaet (egal ueber welchen Weg).
create or replace function public.mi_log_lead_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_label text;
  new_label text;
begin
  if new.status_id is distinct from old.status_id then
    select label into old_label from public.statuses where id = old.status_id;
    select label into new_label from public.statuses where id = new.status_id;
    insert into public.mi_activity_log (type, source, title, detail, lead_id, campaign, status)
    values ('status_changed', 'crm',
            'Status geaendert: ' || coalesce(new.contact_name, new.company_name, 'Lead'),
            coalesce(old_label, '-') || ' -> ' || coalesce(new_label, '-'),
            new.id, coalesce(new.ft_campaign, new.campaign_name), new_label);
  end if;
  return new;
end;
$$;
drop trigger if exists mi_lead_status_change on public.leads;
create trigger mi_lead_status_change after update of status_id on public.leads
  for each row execute function public.mi_log_lead_status_change();

-- ---------------------------------------------------------------------------
-- 11. Row Level Security - Marketing-Daten nur Leitung (super_admin/ceo/cso).
--     Schreiben ausschliesslich serverseitig (Service-Role, umgeht RLS).
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'mi_bookings', 'mi_conversion_events', 'mi_activity_log', 'mi_sync_runs',
    'mi_daily_channel_metrics', 'mi_daily_ad_metrics', 'mi_daily_keyword_metrics',
    'mi_ga4_daily_totals', 'mi_ga4_daily_traffic', 'mi_ga4_daily_pages',
    'mi_gsc_daily_totals', 'mi_gsc_daily'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s_select" on public.%I', t, t);
    execute format(
      'create policy "%s_select" on public.%I for select to authenticated using (public.is_super_admin() or public.has_role(''ceo'') or public.has_role(''cso''))',
      t, t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Aufbewahrung (dokumentiert, keine automatische Loeschung in Produktion):
--   Leads/Kontakte: solange Geschaeftsbeziehung bzw. bis Loeschbegehren.
--   mi_conversion_events.details, Klick-IDs: 24 Monate, danach anonymisieren.
--   mi_activity_log / mi_sync_runs: 12 Monate.
--   Kennzahlen-Tabellen (aggregiert, ohne Personenbezug): unbegrenzt.
-- ---------------------------------------------------------------------------
