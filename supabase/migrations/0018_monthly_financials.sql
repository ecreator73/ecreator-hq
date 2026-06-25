-- ===========================================================================
-- eCreator OS - Phase 18: Manuelle Monatsfinanzen (Monatsuebersicht)
-- ---------------------------------------------------------------------------
-- Eine bewusst EINFACHE, MANUELLE Tabelle: pro Monat traegt man alle Umsaetze
-- und Kosten direkt als Zeilen ein. NICHT an Rechnungen/Vertraege gekoppelt -
-- rein manuelle Erfassung (wie das bisherige Excel "Ziele und Zahlen").
-- Sichtbar nur fuer super_admin / ceo / finance (RLS, wie expenses).
-- Ausfuehren NACH 0017.
-- ===========================================================================

create extension if not exists pgcrypto;

create table if not exists public.monthly_financials (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default '11111111-1111-1111-1111-111111111111'
                references public.organizations (id),
  month       date not null,                 -- erster Tag des Monats (YYYY-MM-01)
  kind        text not null,                 -- 'revenue' (Umsatz) | 'cost' (Kosten)
  label       text not null,                 -- Bezeichnung (z.B. Kundenname / Kostenposition)
  amount      bigint not null default 0,     -- Betrag in Rappen
  category    text,                          -- optionale Kategorie/Notizspalte
  note        text,
  sort_order  integer not null default 0,
  created_by  uuid references public.profiles (id),
  updated_by  uuid references public.profiles (id),
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint monthly_financials_kind_chk check (kind in ('revenue', 'cost'))
);
create index if not exists monthly_financials_month_idx on public.monthly_financials (month);
create index if not exists monthly_financials_kind_idx  on public.monthly_financials (kind);

-- ---------------------------------------------------------------------------
-- Trigger (set_updated_at / stamp_actor / immutables created_by via tasks_stamp_update)
-- ---------------------------------------------------------------------------
drop trigger if exists set_updated_at on public.monthly_financials;
create trigger set_updated_at before update on public.monthly_financials
  for each row execute function public.set_updated_at();

drop trigger if exists stamp_actor on public.monthly_financials;
create trigger stamp_actor before insert on public.monthly_financials
  for each row execute function public.stamp_actor();

drop trigger if exists monthly_financials_stamp_update on public.monthly_financials;
create trigger monthly_financials_stamp_update before update on public.monthly_financials
  for each row execute function public.tasks_stamp_update();

-- ---------------------------------------------------------------------------
-- Row Level Security - nur super_admin / ceo / finance (analog expenses)
-- ---------------------------------------------------------------------------
alter table public.monthly_financials enable row level security;

drop policy if exists "monthly_financials_select" on public.monthly_financials;
create policy "monthly_financials_select" on public.monthly_financials for select to authenticated
  using (
    (deleted_at is null
      and (public.is_super_admin() or public.has_role('ceo') or public.has_role('finance')))
    or public.is_super_admin()
  );
drop policy if exists "monthly_financials_insert" on public.monthly_financials;
create policy "monthly_financials_insert" on public.monthly_financials for insert to authenticated
  with check (public.is_super_admin() or public.has_role('ceo') or public.has_role('finance'));
drop policy if exists "monthly_financials_update" on public.monthly_financials;
create policy "monthly_financials_update" on public.monthly_financials for update to authenticated
  using (public.is_super_admin() or public.has_role('ceo') or public.has_role('finance'))
  with check (public.is_super_admin() or public.has_role('ceo') or public.has_role('finance'));
drop policy if exists "monthly_financials_delete" on public.monthly_financials;
create policy "monthly_financials_delete" on public.monthly_financials for delete to authenticated
  using (public.is_super_admin());
