-- ===========================================================================
-- eCreator OS - Phase 8: Finance, Forecasting, MRR & Business Intelligence
-- ---------------------------------------------------------------------------
-- KEIN Buchhaltungs-/MWST-/Lohn-Modul. Fokus: Umsatz, MRR/ARR, Forecast,
-- Kundenwert, Rentabilitaet. Neu: invoices, expenses. MRR/ARR/Forecast werden
-- zur Laufzeit aus Vertraegen (contracts.value_monthly) + Kosten berechnet.
-- Sichtbar nur fuer super_admin / ceo / finance (RLS). Ausfuehren NACH 0007.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Registry: Rechnungs-Status
-- ---------------------------------------------------------------------------
insert into public.statuses (entity_type, key, label, color, sort_order, is_default) values
  ('invoice', 'draft',     'Entwurf',     'gray',  1, true),
  ('invoice', 'open',      'Offen',       'blue',  2, false),
  ('invoice', 'paid',      'Bezahlt',     'green', 3, false),
  ('invoice', 'overdue',   'Ueberfaellig','red',   4, false),
  ('invoice', 'cancelled', 'Storniert',   'gray',  5, false)
on conflict (entity_type, key) do nothing;

-- ---------------------------------------------------------------------------
-- 2. invoices (ausgehende Rechnungen)
-- ---------------------------------------------------------------------------
create table if not exists public.invoices (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null default '11111111-1111-1111-1111-111111111111'
                   references public.organizations (id),
  client_id      uuid references public.clients (id) on delete set null,
  invoice_number text,
  title          text,
  amount         bigint,        -- Nettobetrag in Rappen
  vat            bigint,        -- MWST-Betrag in Rappen (optional)
  due_date       date,
  paid_date      date,
  status         text not null default 'draft',
  pdf_url        text,
  notes          text,
  created_by     uuid references public.profiles (id),
  updated_by     uuid references public.profiles (id),
  deleted_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists invoices_client_idx on public.invoices (client_id);
create index if not exists invoices_status_idx on public.invoices (status);
create index if not exists invoices_due_idx    on public.invoices (due_date);
create index if not exists invoices_paid_idx   on public.invoices (paid_date);

-- ---------------------------------------------------------------------------
-- 3. expenses (betriebliche Kosten)
-- ---------------------------------------------------------------------------
create table if not exists public.expenses (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null default '11111111-1111-1111-1111-111111111111'
                        references public.organizations (id),
  title               text not null,
  category            text,
  amount              bigint,        -- Betrag in Rappen
  recurring           boolean not null default false,
  recurring_frequency text,          -- monthly/quarterly/yearly
  date                date,
  notes               text,
  created_by          uuid references public.profiles (id),
  updated_by          uuid references public.profiles (id),
  deleted_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists expenses_category_idx  on public.expenses (category);
create index if not exists expenses_recurring_idx on public.expenses (recurring);
create index if not exists expenses_date_idx      on public.expenses (date);

-- ===========================================================================
-- 4. Trigger
-- ===========================================================================
drop trigger if exists set_updated_at on public.invoices;
create trigger set_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.expenses;
create trigger set_updated_at before update on public.expenses
  for each row execute function public.set_updated_at();

drop trigger if exists stamp_actor on public.invoices;
create trigger stamp_actor before insert on public.invoices
  for each row execute function public.stamp_actor();
drop trigger if exists invoices_stamp_update on public.invoices;
create trigger invoices_stamp_update before update on public.invoices
  for each row execute function public.tasks_stamp_update();

drop trigger if exists stamp_actor on public.expenses;
create trigger stamp_actor before insert on public.expenses
  for each row execute function public.stamp_actor();
drop trigger if exists expenses_stamp_update on public.expenses;
create trigger expenses_stamp_update before update on public.expenses
  for each row execute function public.tasks_stamp_update();

drop trigger if exists validate_status on public.invoices;
create trigger validate_status before insert or update on public.invoices
  for each row execute function public.validate_status('invoice');

-- ===========================================================================
-- 5. Row Level Security - Finance nur fuer super_admin / ceo / finance
-- ===========================================================================
alter table public.invoices enable row level security;
alter table public.expenses enable row level security;

-- invoices
drop policy if exists "invoices_select" on public.invoices;
create policy "invoices_select" on public.invoices for select to authenticated
  using (
    (deleted_at is null
      and (public.is_super_admin() or public.has_role('ceo') or public.has_role('finance')))
    or public.is_super_admin()
  );
drop policy if exists "invoices_insert" on public.invoices;
create policy "invoices_insert" on public.invoices for insert to authenticated
  with check (public.is_super_admin() or public.has_role('ceo') or public.has_role('finance'));
drop policy if exists "invoices_update" on public.invoices;
create policy "invoices_update" on public.invoices for update to authenticated
  using (public.is_super_admin() or public.has_role('ceo') or public.has_role('finance'))
  with check (public.is_super_admin() or public.has_role('ceo') or public.has_role('finance'));
drop policy if exists "invoices_delete" on public.invoices;
create policy "invoices_delete" on public.invoices for delete to authenticated
  using (public.is_super_admin());

-- expenses
drop policy if exists "expenses_select" on public.expenses;
create policy "expenses_select" on public.expenses for select to authenticated
  using (
    (deleted_at is null
      and (public.is_super_admin() or public.has_role('ceo') or public.has_role('finance')))
    or public.is_super_admin()
  );
drop policy if exists "expenses_insert" on public.expenses;
create policy "expenses_insert" on public.expenses for insert to authenticated
  with check (public.is_super_admin() or public.has_role('ceo') or public.has_role('finance'));
drop policy if exists "expenses_update" on public.expenses;
create policy "expenses_update" on public.expenses for update to authenticated
  using (public.is_super_admin() or public.has_role('ceo') or public.has_role('finance'))
  with check (public.is_super_admin() or public.has_role('ceo') or public.has_role('finance'));
drop policy if exists "expenses_delete" on public.expenses;
create policy "expenses_delete" on public.expenses for delete to authenticated
  using (public.is_super_admin());
