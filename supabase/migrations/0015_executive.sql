-- ===========================================================================
-- eCreator OS - Phase 15: Executive Command Center & CEO Dashboard
-- ---------------------------------------------------------------------------
-- Management-Fokus: gesamte Firma in 60 Sekunden. Das meiste wird ZUR LAUFZEIT
-- aus bestehenden Modulen (Finance/Sales/Clients/Production) aggregiert.
-- Neu/gespeichert: executive_alerts, company_goals. Nur super_admin/ceo/cso.
-- Ausfuehren NACH 0014.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. executive_alerts (manuell + spaeter automatisch befuellbar)
-- ---------------------------------------------------------------------------
create table if not exists public.executive_alerts (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default '11111111-1111-1111-1111-111111111111'
                references public.organizations (id),
  category    text,    -- revenue/client/contract/project/team/finance/sales
  severity    text,    -- critical/high/medium/info
  title       text not null,
  description text,
  entity_type text,
  entity_id   uuid,
  resolved    boolean not null default false,
  resolved_at timestamptz,
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now()
);
create index if not exists executive_alerts_resolved_idx on public.executive_alerts (resolved, created_at desc);

-- ---------------------------------------------------------------------------
-- 2. company_goals (KPI-Tracking)
-- ---------------------------------------------------------------------------
create table if not exists public.company_goals (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null default '11111111-1111-1111-1111-111111111111'
                  references public.organizations (id),
  title         text not null,
  target_value  numeric,
  current_value numeric not null default 0,
  unit          text,
  due_date      date,
  owner_id      uuid references public.profiles (id) on delete set null,
  created_by    uuid references public.profiles (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ===========================================================================
-- 3. Trigger
-- ===========================================================================
drop trigger if exists set_updated_at on public.company_goals;
create trigger set_updated_at before update on public.company_goals
  for each row execute function public.set_updated_at();
drop trigger if exists stamp_created_by on public.executive_alerts;
create trigger stamp_created_by before insert on public.executive_alerts
  for each row execute function public.stamp_created_by_only();
drop trigger if exists stamp_created_by on public.company_goals;
create trigger stamp_created_by before insert on public.company_goals
  for each row execute function public.stamp_created_by_only();

-- ===========================================================================
-- 4. Row Level Security - nur super_admin / ceo / cso
-- ===========================================================================
do $$
declare t text;
begin
  foreach t in array array['executive_alerts','company_goals']
  loop
    execute format('alter table public.%1$s enable row level security;', t);
    execute format('drop policy if exists "%1$s_all" on public.%1$s;', t);
    execute format($f$
      create policy "%1$s_all" on public.%1$s for all to authenticated
      using (public.is_super_admin() or public.has_role('ceo') or public.has_role('cso'))
      with check (public.is_super_admin() or public.has_role('ceo') or public.has_role('cso'));
    $f$, t);
  end loop;
end $$;
