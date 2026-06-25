-- ===========================================================================
-- eCreator OS - Ad-Lead-Integrationen (Meta jetzt; Google/TikTok/LinkedIn spaeter
-- nach demselben Muster). Speichert die Verbindung je Anbieter, ein Event-Log
-- der eingehenden Lead-Webhooks und Meta-Felder auf der leads-Tabelle.
-- Tokens werden NUR verschluesselt gespeichert (AES-256-GCM, CREDENTIALS_SECRET).
-- Im Supabase SQL-Editor ausfuehren (DDL). Idempotent. NACH 0019.
-- ===========================================================================

create extension if not exists pgcrypto;

-- 1. Verbindung je Anbieter (genau eine pro org+provider)
create table if not exists public.ad_integrations (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid not null default '11111111-1111-1111-1111-111111111111'
                          references public.organizations (id),
  provider              text not null,                 -- 'meta'
  status                text not null default 'disconnected', -- disconnected/connected/error
  account_name          text,                          -- z.B. Business-Name
  config                jsonb not null default '{}'::jsonb,   -- business/ad_account/pages/forms (KEINE Secrets)
  credentials_encrypted text,                          -- verschluesseltes JSON: {user_token, page_tokens}
  webhook_verified      boolean not null default false,
  webhook_last_event_at timestamptz,
  last_sync_at          timestamptz,
  last_error            text,
  created_by            uuid references public.profiles (id),
  updated_by            uuid references public.profiles (id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (org_id, provider)
);

-- 2. Event-Log eingehender Lead-Webhooks (Monitoring + Idempotenz + Retry-Analyse)
create table if not exists public.ad_lead_events (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null default '11111111-1111-1111-1111-111111111111'
                    references public.organizations (id),
  provider        text not null,
  received_at     timestamptz not null default now(),
  signature_valid boolean,
  external_id     text,                                -- leadgen_id
  form_id         text,
  page_id         text,
  status          text not null default 'received',    -- received/processed/duplicate/error/skipped
  lead_id         uuid references public.leads (id) on delete set null,
  error           text,
  payload         jsonb
);
create index if not exists ad_lead_events_received_idx on public.ad_lead_events (received_at desc);
create index if not exists ad_lead_events_external_idx on public.ad_lead_events (external_id);

-- 3. Meta-/Ad-Felder auf leads
alter table public.leads
  add column if not exists external_lead_id text,      -- Facebook Lead ID
  add column if not exists form_id         text,
  add column if not exists form_name       text,
  add column if not exists ad_id           text,
  add column if not exists ad_name         text,
  add column if not exists adset_id        text,
  add column if not exists adset_name      text,
  add column if not exists campaign_id     text;
create unique index if not exists leads_external_lead_id_key
  on public.leads (external_lead_id) where external_lead_id is not null;

-- 4. Trigger
drop trigger if exists set_updated_at on public.ad_integrations;
create trigger set_updated_at before update on public.ad_integrations
  for each row execute function public.set_updated_at();
drop trigger if exists stamp_actor on public.ad_integrations;
create trigger stamp_actor before insert on public.ad_integrations
  for each row execute function public.stamp_actor();

-- 5. RLS - Verwaltung nur Leitung (super_admin/ceo/cso); Schreibzugriff des
--    Webhooks laeuft serverseitig ueber die Service-Role (umgeht RLS).
alter table public.ad_integrations enable row level security;
alter table public.ad_lead_events enable row level security;

drop policy if exists "ad_integrations_rw" on public.ad_integrations;
create policy "ad_integrations_rw" on public.ad_integrations for all to authenticated
  using (public.is_super_admin() or public.has_role('ceo') or public.has_role('cso'))
  with check (public.is_super_admin() or public.has_role('ceo') or public.has_role('cso'));

drop policy if exists "ad_lead_events_select" on public.ad_lead_events;
create policy "ad_lead_events_select" on public.ad_lead_events for select to authenticated
  using (public.is_super_admin() or public.has_role('ceo') or public.has_role('cso'));
