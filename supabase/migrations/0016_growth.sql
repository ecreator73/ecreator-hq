-- ===========================================================================
-- eCreator OS - Phase 16: Upsell, Referral & Renewal Engine (Revenue Expansion)
-- ---------------------------------------------------------------------------
-- Mehr Umsatz aus bestehenden Kunden - strukturiert und messbar. Neu:
-- upsell_opportunities, referral_opportunities, review_requests, renewals,
-- churn_risks, testimonials. Erkennung/Scoring zur Laufzeit aus Projekten/
-- Vertraegen/Kundenstatus. Nur super_admin/ceo/cso/sales. NACH 0015.
-- ===========================================================================

create extension if not exists pgcrypto;

create table if not exists public.upsell_opportunities (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null default '11111111-1111-1111-1111-111111111111'
                     references public.organizations (id),
  client_id        uuid not null references public.clients (id) on delete cascade,
  opportunity_type text,
  score            integer not null default 0,
  reason           text,
  recommendation   text,
  estimated_value  bigint,        -- Rappen (monatlich)
  status           text not null default 'open',  -- open/in_progress/won/lost/dismissed
  created_by       uuid references public.profiles (id),
  created_at       timestamptz not null default now()
);
create index if not exists upsell_client_idx on public.upsell_opportunities (client_id, status);

create table if not exists public.referral_opportunities (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null default '11111111-1111-1111-1111-111111111111'
               references public.organizations (id),
  client_id  uuid not null references public.clients (id) on delete cascade,
  score      integer not null default 0,
  reason     text,
  status     text not null default 'open',
  created_at timestamptz not null default now()
);
create index if not exists referral_client_idx on public.referral_opportunities (client_id, status);

create table if not exists public.review_requests (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null default '11111111-1111-1111-1111-111111111111'
                 references public.organizations (id),
  client_id    uuid not null references public.clients (id) on delete cascade,
  request_date date,
  status       text not null default 'pending',  -- pending/requested/received/declined
  review_url   text,
  created_at   timestamptz not null default now()
);
create index if not exists review_client_idx on public.review_requests (client_id, status);

create table if not exists public.renewals (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null default '11111111-1111-1111-1111-111111111111'
                        references public.organizations (id),
  contract_id         uuid references public.contracts (id) on delete set null,
  client_id           uuid not null references public.clients (id) on delete cascade,
  renewal_score       integer not null default 0,
  renewal_probability integer not null default 0,
  status              text not null default 'pending',  -- pending/in_progress/renewed/lost
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists renewals_client_idx on public.renewals (client_id, status);

create table if not exists public.churn_risks (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null default '11111111-1111-1111-1111-111111111111'
               references public.organizations (id),
  client_id  uuid not null references public.clients (id) on delete cascade,
  score      integer not null default 0,
  reasons    text,
  created_at timestamptz not null default now()
);
create index if not exists churn_client_idx on public.churn_risks (client_id);

create table if not exists public.testimonials (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null default '11111111-1111-1111-1111-111111111111'
               references public.organizations (id),
  client_id  uuid not null references public.clients (id) on delete cascade,
  type       text,        -- text/video/case_study
  status     text not null default 'requested',  -- requested/in_progress/received/published
  content    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists testimonials_client_idx on public.testimonials (client_id);

-- ===========================================================================
-- Trigger
-- ===========================================================================
drop trigger if exists set_updated_at on public.renewals;
create trigger set_updated_at before update on public.renewals
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.testimonials;
create trigger set_updated_at before update on public.testimonials
  for each row execute function public.set_updated_at();
drop trigger if exists stamp_created_by on public.upsell_opportunities;
create trigger stamp_created_by before insert on public.upsell_opportunities
  for each row execute function public.stamp_created_by_only();

-- ===========================================================================
-- Row Level Security - nur super_admin / ceo / cso / sales
-- ===========================================================================
do $$
declare t text;
begin
  foreach t in array array['upsell_opportunities','referral_opportunities','review_requests','renewals','churn_risks','testimonials']
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
