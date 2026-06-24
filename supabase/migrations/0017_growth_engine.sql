-- ===========================================================================
-- eCreator OS - Phase 17: Autonomous Growth Engine (Orchestrierungsschicht)
-- ---------------------------------------------------------------------------
-- Verbindet alle Module zu einem Funnel: Lead -> Opportunity -> Audit ->
-- Outreach -> Termin -> Proposal -> Vertrag -> Kunde -> Reporting -> Upsell ->
-- Referral -> Verlaengerung. Die Engine FUEHRT NICHT automatisch aus, sondern
-- schlaegt vor, priorisiert, erzeugt Aufgaben/Erinnerungen/Alerts. Mensch bleibt
-- Entscheider. Neu: revenue_journeys, growth_recommendations,
-- automation_orchestrations, growth_alerts. Nur super_admin/ceo/cso. NACH 0016.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Revenue Journey: der Weg eines Lead/Kunden durch den gesamten Funnel.
-- ---------------------------------------------------------------------------
create table if not exists public.revenue_journeys (
  id                      uuid primary key default gen_random_uuid(),
  org_id                  uuid not null default '11111111-1111-1111-1111-111111111111'
                            references public.organizations (id),
  lead_id                 uuid references public.leads (id) on delete set null,
  client_id               uuid references public.clients (id) on delete set null,
  current_stage           text not null default 'discovery',  -- siehe REVENUE_STAGES
  next_recommended_action text,
  estimated_value         bigint,        -- Rappen
  owner_id                uuid references public.profiles (id) on delete set null,
  status                  text not null default 'active',      -- active/won/lost/paused
  created_by              uuid references public.profiles (id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index if not exists revenue_journeys_stage_idx on public.revenue_journeys (current_stage, status);
create index if not exists revenue_journeys_lead_idx on public.revenue_journeys (lead_id);
create index if not exists revenue_journeys_client_idx on public.revenue_journeys (client_id);

-- ---------------------------------------------------------------------------
-- Growth Recommendation: konkrete naechste-beste-Aktion fuer eine Entitaet.
-- ---------------------------------------------------------------------------
create table if not exists public.growth_recommendations (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null default '11111111-1111-1111-1111-111111111111'
                    references public.organizations (id),
  entity_type     text not null,        -- lead/lead_company/client/audit/outreach/meeting/proposal/contract
  entity_id       uuid,
  title           text not null,
  recommendation  text,                 -- naechster bester Schritt
  reason          text,
  priority        text not null default 'medium',  -- critical/high/medium/low
  estimated_value bigint,               -- Rappen
  href            text,                 -- Deep-Link in die App
  status          text not null default 'open',    -- open/done/dismissed/snoozed
  created_by      uuid references public.profiles (id),
  created_at      timestamptz not null default now()
);
create index if not exists growth_recommendations_status_idx on public.growth_recommendations (status, priority);
create index if not exists growth_recommendations_entity_idx on public.growth_recommendations (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Automation Orchestration: deklarative Trigger -> Aktion-Regeln (Vorschlag,
-- keine ungefragte Ausfuehrung von E-Mails/Vertraegen/Rechnungen).
-- ---------------------------------------------------------------------------
create table if not exists public.automation_orchestrations (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default '11111111-1111-1111-1111-111111111111'
                references public.organizations (id),
  name        text not null,
  trigger     text not null,
  action      text not null,
  description text,
  status      text not null default 'active',   -- active/paused/inactive
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists automation_orchestrations_status_idx on public.automation_orchestrations (status);

-- ---------------------------------------------------------------------------
-- Growth Alert: gespeicherte Warnung der Engine (Vertrag laeuft aus, Angebot
-- ohne Antwort, Kunde ohne Kontakt, hohes Churn-Risiko ...).
-- ---------------------------------------------------------------------------
create table if not exists public.growth_alerts (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default '11111111-1111-1111-1111-111111111111'
                references public.organizations (id),
  severity    text not null default 'info',     -- critical/high/medium/info
  title       text not null,
  description text,
  entity_type text,
  entity_id   uuid,
  resolved    boolean not null default false,
  resolved_at timestamptz,
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now()
);
create index if not exists growth_alerts_open_idx on public.growth_alerts (resolved, severity);

-- ===========================================================================
-- Trigger
-- ===========================================================================
drop trigger if exists set_updated_at on public.revenue_journeys;
create trigger set_updated_at before update on public.revenue_journeys
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.automation_orchestrations;
create trigger set_updated_at before update on public.automation_orchestrations
  for each row execute function public.set_updated_at();

drop trigger if exists stamp_created_by on public.revenue_journeys;
create trigger stamp_created_by before insert on public.revenue_journeys
  for each row execute function public.stamp_created_by_only();
drop trigger if exists stamp_created_by on public.growth_recommendations;
create trigger stamp_created_by before insert on public.growth_recommendations
  for each row execute function public.stamp_created_by_only();
drop trigger if exists stamp_created_by on public.automation_orchestrations;
create trigger stamp_created_by before insert on public.automation_orchestrations
  for each row execute function public.stamp_created_by_only();
drop trigger if exists stamp_created_by on public.growth_alerts;
create trigger stamp_created_by before insert on public.growth_alerts
  for each row execute function public.stamp_created_by_only();

-- ===========================================================================
-- Seed: Standard-Orchestrierungsregeln (idempotent ueber name). Diese sind
-- Vorschlags-Regeln; die Ausfuehrung bleibt menschlich bestaetigt.
-- ===========================================================================
insert into public.automation_orchestrations (name, trigger, action, description, status)
select v.name, v.trigger, v.action, v.description, 'active'
from (values
  ('Lead -> Audit',        'Lead erstellt',              'Website-Audit empfehlen',   'Neuer Lead ohne Audit: Audit-Empfehlung erzeugen.'),
  ('Proposal -> Onboarding','Proposal akzeptiert',       'Onboarding starten',        'Angenommenes Angebot: Onboarding-Aufgaben empfehlen.'),
  ('Kunde -> Review',      'Kunde 60 Tage aktiv',        'Bewertung empfehlen',       'Zufriedener Bestandskunde: Review-Anfrage empfehlen.'),
  ('Vertrag -> Renewal',   'Vertrag 90 Tage vor Ende',   'Verlaengerung empfehlen',   'Auslaufender Vertrag: Renewal-Empfehlung erzeugen.')
) as v(name, trigger, action, description)
where not exists (
  select 1 from public.automation_orchestrations o where o.name = v.name
);

-- ===========================================================================
-- Row Level Security - nur super_admin / ceo / cso (Orchestrierungsschicht).
-- ===========================================================================
do $$
declare t text;
begin
  foreach t in array array['revenue_journeys','growth_recommendations','automation_orchestrations','growth_alerts']
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
