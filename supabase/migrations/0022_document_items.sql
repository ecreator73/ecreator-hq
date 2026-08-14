-- ===========================================================================
-- eCreator OS - Positionen fuer Offerten und Vertraege
-- ---------------------------------------------------------------------------
-- Bisher hatte ein Angebot/Vertrag genau EINEN Betrag. Fuer Dokumente im
-- Original-Layout (Pos. | Beschreibung | Menge | Einzelpreis | Gesamt) braucht
-- es mehrere Positionen. Eine Tabelle fuer beide Belegarten - genau eine der
-- beiden Referenzen ist gesetzt.
-- Ausfuehren NACH 0021.
-- ===========================================================================

create extension if not exists pgcrypto;

create table if not exists public.document_items (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default '11111111-1111-1111-1111-111111111111'
                references public.organizations (id),
  offer_id    uuid references public.offers (id) on delete cascade,
  contract_id uuid references public.contracts (id) on delete cascade,
  -- Genau eine Belegart je Position
  constraint document_items_one_parent check (
    (offer_id is not null)::int + (contract_id is not null)::int = 1
  ),
  description text not null,
  detail      text,
  quantity    numeric(10,2) not null default 1 check (quantity > 0),
  /** Einzelpreis in Rappen (wie ueberall im System). */
  unit_price  bigint not null default 0 check (unit_price >= 0),
  /** true = wiederkehrend pro Monat, false = einmalig. */
  recurring   boolean not null default false,
  sort_order  integer not null default 0,
  created_by  uuid references public.profiles (id),
  updated_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists document_items_offer_idx    on public.document_items (offer_id, sort_order);
create index if not exists document_items_contract_idx on public.document_items (contract_id, sort_order);

-- ---------------------------------------------------------------------------
-- Trigger
-- ---------------------------------------------------------------------------
drop trigger if exists set_updated_at on public.document_items;
create trigger set_updated_at before update on public.document_items
  for each row execute function public.set_updated_at();

drop trigger if exists stamp_actor on public.document_items;
create trigger stamp_actor before insert on public.document_items
  for each row execute function public.stamp_actor();

drop trigger if exists document_items_stamp_update on public.document_items;
create trigger document_items_stamp_update before update on public.document_items
  for each row execute function public.tasks_stamp_update();

-- ---------------------------------------------------------------------------
-- RLS: gleiche Rechte wie Angebote/Vertraege (Sales + Leitung)
-- ---------------------------------------------------------------------------
alter table public.document_items enable row level security;
drop policy if exists "document_items_all" on public.document_items;
create policy "document_items_all" on public.document_items for all to authenticated
  using (
    public.is_super_admin() or public.has_role('ceo') or public.has_role('cso')
    or public.has_role('sales') or public.has_role('finance')
  )
  with check (
    public.is_super_admin() or public.has_role('ceo') or public.has_role('cso')
    or public.has_role('sales') or public.has_role('finance')
  );
