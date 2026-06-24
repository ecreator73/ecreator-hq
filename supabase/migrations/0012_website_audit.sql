-- ===========================================================================
-- eCreator OS - Phase 12: Website Audit Engine & Opportunity Reports
-- ---------------------------------------------------------------------------
-- Analysiert Webseiten (Struktur, keine tiefe AI/Live-Fetch), erkennt
-- Schwachstellen und Opportunities und erzeugt Sales-Material. Neu:
-- website_audits, audit_findings, audit_opportunities. Verknuepfung optional
-- mit lead_companies (Phase 10). Nur super_admin/ceo/cso/sales. NACH 0011.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. website_audits
-- ---------------------------------------------------------------------------
create table if not exists public.website_audits (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null default '11111111-1111-1111-1111-111111111111'
                      references public.organizations (id),
  lead_company_id   uuid references public.lead_companies (id) on delete set null,
  url               text,
  status            text not null default 'draft',   -- draft/generated
  design_score      integer not null default 0,
  conversion_score  integer not null default 0,
  seo_score         integer not null default 0,
  trust_score       integer not null default 0,
  performance_score integer not null default 0,
  mobile_score      integer not null default 0,
  content_score     integer not null default 0,
  tracking_score    integer not null default 0,
  overall_score     integer not null default 0,
  executive_summary text,
  top_problems      jsonb not null default '[]'::jsonb,
  quick_wins        jsonb not null default '[]'::jsonb,
  sales_opportunity text,
  generated_at      timestamptz,
  created_by        uuid references public.profiles (id),
  updated_by        uuid references public.profiles (id),
  deleted_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists website_audits_company_idx on public.website_audits (lead_company_id);
create index if not exists website_audits_score_idx   on public.website_audits (overall_score);
create index if not exists website_audits_created_idx on public.website_audits (created_at desc);

-- ---------------------------------------------------------------------------
-- 2. audit_findings
-- ---------------------------------------------------------------------------
create table if not exists public.audit_findings (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null default '11111111-1111-1111-1111-111111111111'
                   references public.organizations (id),
  audit_id       uuid not null references public.website_audits (id) on delete cascade,
  category       text,
  severity       text,    -- critical/high/medium/low
  title          text,
  description    text,
  recommendation text,
  created_at     timestamptz not null default now()
);
create index if not exists audit_findings_audit_idx on public.audit_findings (audit_id);

-- ---------------------------------------------------------------------------
-- 3. audit_opportunities
-- ---------------------------------------------------------------------------
create table if not exists public.audit_opportunities (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null default '11111111-1111-1111-1111-111111111111'
                     references public.organizations (id),
  audit_id         uuid not null references public.website_audits (id) on delete cascade,
  opportunity_type text,
  score            integer not null default 0,
  reason           text,
  recommendation   text,
  created_at       timestamptz not null default now()
);
create index if not exists audit_opportunities_audit_idx on public.audit_opportunities (audit_id);

-- ===========================================================================
-- 4. Trigger
-- ===========================================================================
drop trigger if exists set_updated_at on public.website_audits;
create trigger set_updated_at before update on public.website_audits
  for each row execute function public.set_updated_at();
drop trigger if exists stamp_actor on public.website_audits;
create trigger stamp_actor before insert on public.website_audits
  for each row execute function public.stamp_actor();
drop trigger if exists website_audits_stamp_update on public.website_audits;
create trigger website_audits_stamp_update before update on public.website_audits
  for each row execute function public.tasks_stamp_update();

-- ===========================================================================
-- 5. Row Level Security - nur super_admin / ceo / cso / sales
-- ===========================================================================
do $$
declare t text;
begin
  foreach t in array array['website_audits','audit_findings','audit_opportunities']
  loop
    execute format('alter table public.%1$s enable row level security;', t);
    execute format('drop policy if exists "%1$s_all" on public.%1$s;', t);
    execute format($f$
      create policy "%1$s_all" on public.%1$s for all to authenticated
      using (public.is_super_admin() or public.has_role('ceo') or public.has_role('cso') or public.has_role('sales'))
      with check (public.is_super_admin() or public.has_role('ceo') or public.has_role('cso') or public.has_role('sales'));
    $f$, t);
  end loop;
end $$;
