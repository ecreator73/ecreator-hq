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
