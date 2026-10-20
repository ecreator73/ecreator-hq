-- ===========================================================================
-- 0029 Finance aus dem Lovable-CRM (Stufe 4)
--  clients            + customer_number (Kundennummer, z. B. 100017; Teil von
--                       Rechnungsnummer KD-100017-83 und QR-Referenz)
--  invoices           + Rechnungsdatum, Periode, MWST-Satz, QR-Referenz, Laufnummer,
--                       Vertrag, Versand, Mahnstufe, legacy_id
--  invoice_items      Rechnungspositionen (Rappen)
--  invoice_payments   Zahlungseingaenge (manuell oder aus Kontoauszug camt.053/054)
--  monthly_financials + legacy_id, Kunde, Provision, Vertragsbeginn, Laufzeit
-- Zugriff wie invoices: Super Admin, CEO, Finance.
-- Im Supabase SQL-Editor ausfuehren. Idempotent. NACH 0028. Loescht nichts.
-- ===========================================================================

-- 1. Kundennummer -------------------------------------------------------------
alter table public.clients add column if not exists customer_number integer;
create unique index if not exists clients_customer_number_key on public.clients (customer_number) where customer_number is not null;

-- 2. Rechnungen ------------------------------------------------------------------
alter table public.invoices
  add column if not exists legacy_id         text,
  add column if not exists contract_id       uuid references public.contracts (id) on delete set null,
  add column if not exists issue_date        date,
  add column if not exists period_from       date,
  add column if not exists period_to         date,
  add column if not exists vat_rate          numeric(4,2) not null default 8.1,
  add column if not exists invoice_seq       integer,
  add column if not exists qr_reference      text,
  add column if not exists sent_at           timestamptz,
  add column if not exists reminder_stage    integer not null default 0,
  add column if not exists last_reminder_at  timestamptz,
  add column if not exists cancelled_at      timestamptz;
create unique index if not exists invoices_legacy_id_key on public.invoices (legacy_id) where legacy_id is not null;
create unique index if not exists invoices_qr_reference_key on public.invoices (qr_reference) where qr_reference is not null and deleted_at is null;
create unique index if not exists invoices_number_key on public.invoices (invoice_number) where invoice_number is not null and deleted_at is null;
create index if not exists invoices_period_idx on public.invoices (period_from);

create table if not exists public.invoice_items (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null default '11111111-1111-1111-1111-111111111111' references public.organizations (id),
  legacy_id    text unique,
  invoice_id   uuid not null references public.invoices (id) on delete cascade,
  position     integer not null default 1,
  title        text not null,
  description  text,
  quantity     numeric(10,2) not null default 1 check (quantity > 0),
  unit         text,
  unit_price   bigint not null default 0,          -- Rappen, netto
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists invoice_items_invoice_idx on public.invoice_items (invoice_id, position);

create table if not exists public.invoice_payments (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default '11111111-1111-1111-1111-111111111111' references public.organizations (id),
  invoice_id  uuid not null references public.invoices (id) on delete cascade,
  amount      bigint not null check (amount > 0),   -- Rappen
  paid_on     date not null,
  source      text not null default 'manual' check (source in ('manual', 'camt')),
  reference   text,                                 -- QR-Referenz aus dem Kontoauszug
  bank_entry  text,                                 -- Eindeutige Buchungs-ID (Doppelte verhindern)
  note        text,
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now()
);
create index if not exists invoice_payments_invoice_idx on public.invoice_payments (invoice_id);
create unique index if not exists invoice_payments_bank_entry_key on public.invoice_payments (bank_entry) where bank_entry is not null;

-- 3. Monatszahlen ---------------------------------------------------------------
alter table public.monthly_financials
  add column if not exists legacy_id          text,
  add column if not exists client_id          uuid references public.clients (id) on delete set null,
  add column if not exists commission         bigint,     -- Rappen
  add column if not exists contract_start     text,
  add column if not exists contract_duration  text;
create unique index if not exists monthly_financials_legacy_id_key on public.monthly_financials (legacy_id) where legacy_id is not null;

-- 4. Zugriff ----------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['invoice_items','invoice_payments']
  loop
    execute format('alter table public.%1$s enable row level security;', t);
    execute format('drop policy if exists "%1$s_rw" on public.%1$s;', t);
    execute format('create policy "%1$s_rw" on public.%1$s for all to authenticated using (public.is_super_admin() or public.has_role(''ceo'') or public.has_role(''finance'')) with check (public.is_super_admin() or public.has_role(''ceo'') or public.has_role(''finance''));', t);
  end loop;
  drop trigger if exists set_updated_at on public.invoice_items;
  create trigger set_updated_at before update on public.invoice_items for each row execute function public.set_updated_at();
end $$;
