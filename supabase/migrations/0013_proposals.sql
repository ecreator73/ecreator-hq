-- ===========================================================================
-- eCreator OS - Phase 13: Proposal Engine, Praesentationen, Vertraege & Rechnungen
-- ---------------------------------------------------------------------------
-- Aus Lead/Audit/Opportunity professionelle Verkaufsunterlagen vorbereiten:
-- Offerte, Praesentation, Vertragsentwurf, Rechnungsentwurf. Neu: proposals,
-- proposal_items, pricing_items (Preislogik). Kein Rechtsersatz - Entwuerfe.
-- Erstellen: super_admin/ceo/cso/sales. Preise bearbeiten: super_admin/ceo.
-- Ausfuehren NACH 0012.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Registry: Proposal-Status
-- ---------------------------------------------------------------------------
insert into public.statuses (entity_type, key, label, color, sort_order, is_default) values
  ('proposal', 'draft',    'Entwurf',           'gray',  1, true),
  ('proposal', 'review',   'Bereit zur Pruefung','amber', 2, false),
  ('proposal', 'sent',     'Gesendet',          'blue',  3, false),
  ('proposal', 'accepted', 'Akzeptiert',        'green', 4, false),
  ('proposal', 'rejected', 'Abgelehnt',         'red',   5, false),
  ('proposal', 'archived', 'Archiviert',        'gray',  6, false)
on conflict (entity_type, key) do nothing;

-- ---------------------------------------------------------------------------
-- 2. pricing_items (Preislogik - verwaltbar in Settings)
-- ---------------------------------------------------------------------------
create table if not exists public.pricing_items (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default '11111111-1111-1111-1111-111111111111'
                references public.organizations (id),
  name        text not null,
  category    text,
  unit_price  bigint,        -- Rappen
  recurring   boolean not null default false,
  active      boolean not null default true,
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists pricing_items_category_idx on public.pricing_items (category);

-- ---------------------------------------------------------------------------
-- 3. proposals
-- ---------------------------------------------------------------------------
create table if not exists public.proposals (
  id                      uuid primary key default gen_random_uuid(),
  org_id                  uuid not null default '11111111-1111-1111-1111-111111111111'
                            references public.organizations (id),
  lead_id                 uuid references public.leads (id) on delete set null,
  client_id               uuid references public.clients (id) on delete set null,
  title                   text not null,
  proposal_type           text,
  status                  text not null default 'draft',
  amount                  bigint,   -- Gesamt (Rappen)
  monthly_amount          bigint,   -- monatlich (Rappen)
  setup_fee               bigint,   -- einmalig (Rappen)
  contract_duration_months integer,
  version                 integer not null default 1,
  parent_id               uuid references public.proposals (id) on delete set null,
  -- Offerten-/Vertragsinhalt
  situation               text,
  goal                    text,
  solution                text,
  next_steps              text,
  contract_start_date     date,
  payment_terms           text,
  cancellation_terms      text,
  pdf_url                 text,
  presentation_url        text,
  contract_url            text,
  invoice_id              uuid references public.invoices (id) on delete set null,
  created_by              uuid references public.profiles (id),
  updated_by              uuid references public.profiles (id),
  deleted_at              timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index if not exists proposals_lead_idx   on public.proposals (lead_id);
create index if not exists proposals_client_idx on public.proposals (client_id);
create index if not exists proposals_status_idx on public.proposals (status);
create index if not exists proposals_parent_idx on public.proposals (parent_id);

-- ---------------------------------------------------------------------------
-- 4. proposal_items
-- ---------------------------------------------------------------------------
create table if not exists public.proposal_items (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default '11111111-1111-1111-1111-111111111111'
                references public.organizations (id),
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  title       text not null,
  description text,
  quantity    numeric(10,2) not null default 1,
  unit_price  bigint,        -- Rappen
  total_price bigint,        -- Rappen
  recurring   boolean not null default false,
  category    text,
  order_index integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists proposal_items_proposal_idx on public.proposal_items (proposal_id, order_index);

-- ===========================================================================
-- 5. Trigger
-- ===========================================================================
drop trigger if exists set_updated_at on public.pricing_items;
create trigger set_updated_at before update on public.pricing_items
  for each row execute function public.set_updated_at();
drop trigger if exists stamp_created_by on public.pricing_items;
create trigger stamp_created_by before insert on public.pricing_items
  for each row execute function public.stamp_created_by_only();

drop trigger if exists set_updated_at on public.proposals;
create trigger set_updated_at before update on public.proposals
  for each row execute function public.set_updated_at();
drop trigger if exists stamp_actor on public.proposals;
create trigger stamp_actor before insert on public.proposals
  for each row execute function public.stamp_actor();
drop trigger if exists proposals_stamp_update on public.proposals;
create trigger proposals_stamp_update before update on public.proposals
  for each row execute function public.tasks_stamp_update();
drop trigger if exists validate_status on public.proposals;
create trigger validate_status before insert or update on public.proposals
  for each row execute function public.validate_status('proposal');

-- ===========================================================================
-- 6. Row Level Security
-- ===========================================================================
alter table public.proposals      enable row level security;
alter table public.proposal_items enable row level security;
alter table public.pricing_items  enable row level security;

-- proposals + proposal_items: super_admin/ceo/cso/sales
do $$
declare t text;
begin
  foreach t in array array['proposals','proposal_items']
  loop
    execute format('drop policy if exists "%1$s_all" on public.%1$s;', t);
    execute format($f$
      create policy "%1$s_all" on public.%1$s for all to authenticated
      using (public.is_super_admin() or public.has_role('ceo') or public.has_role('cso') or public.has_role('sales'))
      with check (public.is_super_admin() or public.has_role('ceo') or public.has_role('cso') or public.has_role('sales'));
    $f$, t);
  end loop;
end $$;

-- pricing_items: lesen super_admin/ceo/cso/sales; schreiben NUR super_admin/ceo
drop policy if exists "pricing_items_select" on public.pricing_items;
create policy "pricing_items_select" on public.pricing_items for select to authenticated
  using (public.is_super_admin() or public.has_role('ceo') or public.has_role('cso') or public.has_role('sales'));
drop policy if exists "pricing_items_write" on public.pricing_items;
create policy "pricing_items_write" on public.pricing_items for all to authenticated
  using (public.is_super_admin() or public.has_role('ceo'))
  with check (public.is_super_admin() or public.has_role('ceo'));
