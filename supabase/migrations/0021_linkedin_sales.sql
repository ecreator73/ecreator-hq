-- ===========================================================================
-- eCreator OS - Phase 19: LinkedIn Sales
-- ---------------------------------------------------------------------------
-- Systematische LinkedIn-Akquise fuer Fabian: Prospects, Kampagnen,
-- Nachrichten-VORLAGEN (KEIN automatischer Versand!), Follow-ups, Aktivitaeten,
-- Statistiken. Prospects sind bewusst GETRENNT von leads; Konvertierung via
-- "In Lead umwandeln" (Quelle: linkedin), Prospect bleibt archiviert.
-- Nur super_admin/ceo/cso/sales. Ausfuehren NACH 0020.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Registry: Prospect-Status (12 Stufen des LinkedIn-Vertriebsprozesses)
-- ---------------------------------------------------------------------------
insert into public.statuses (entity_type, key, label, color, sort_order, is_default) values
  ('linkedin_prospect', 'neu',                      'Neu',                          'blue',  1,  true),
  ('linkedin_prospect', 'zu_recherchieren',         'Zu recherchieren',             'gray',  2,  false),
  ('linkedin_prospect', 'kontaktanfrage_gesendet',  'Kontaktanfrage gesendet',      'blue',  3,  false),
  ('linkedin_prospect', 'verbunden',                'Verbunden',                    'blue',  4,  false),
  ('linkedin_prospect', 'erste_nachricht_gesendet', 'Erste Nachricht gesendet',     'blue',  5,  false),
  ('linkedin_prospect', 'antwort_erhalten',         'Antwort erhalten',             'amber', 6,  false),
  ('linkedin_prospect', 'termin_vereinbart',        'Termin vereinbart',            'green', 7,  false),
  ('linkedin_prospect', 'angebot',                  'Angebot',                      'amber', 8,  false),
  ('linkedin_prospect', 'gewonnen',                 'Gewonnen',                     'green', 9,  false),
  ('linkedin_prospect', 'verloren',                 'Verloren',                     'red',   10, false),
  ('linkedin_prospect', 'nicht_interessiert',       'Nicht interessiert',           'gray',  11, false),
  ('linkedin_prospect', 'spaeter_kontaktieren',     'Spaeter erneut kontaktieren',  'amber', 12, false)
on conflict (entity_type, key) do nothing;

-- ---------------------------------------------------------------------------
-- 2. linkedin_campaigns (z.B. Broker Schweiz, Spitex, Treuhaender, ...)
-- ---------------------------------------------------------------------------
create table if not exists public.linkedin_campaigns (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null default '11111111-1111-1111-1111-111111111111'
                    references public.organizations (id),
  name            text not null,
  description     text,
  target_audience text,
  status          text not null default 'active'
                    check (status in ('active','paused','archived')),
  created_by      uuid references public.profiles (id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. linkedin_prospects (Kern-Datenbank; NICHT identisch mit leads!)
-- ---------------------------------------------------------------------------
create table if not exists public.linkedin_prospects (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null default '11111111-1111-1111-1111-111111111111'
                        references public.organizations (id),
  -- Stammdaten
  full_name           text not null,
  company_name        text,
  position            text,
  industry            text,
  company_size        text,
  location            text,
  linkedin_url        text,
  website             text,
  phone               text,
  email               text,
  -- Prozess
  status              text not null default 'neu',
  campaign_id         uuid references public.linkedin_campaigns (id) on delete set null,
  owner_id            uuid references public.profiles (id),
  priority            text not null default 'medium'
                        check (priority in ('low','medium','high')),
  lead_score          integer not null default 0 check (lead_score between 0 and 100),
  last_activity_at    timestamptz,
  next_followup_date  date,
  -- Recherche (KI ergaenzt diese Felder spaeter; bis dahin manuell)
  company_description text,
  services            text,
  social_links        text,
  google_reviews      text,
  possible_problems   text,
  potential_marketing text,
  potential_crm       text,
  potential_seo       text,
  potential_ads       text,
  potential_website   text,
  -- Notizen (Markdown inkl. Checklisten)
  notes_md            text,
  -- CRM-Integration: nach Konvertierung bleibt der Prospect archiviert
  converted_lead_id   uuid references public.leads (id) on delete set null,
  archived_at         timestamptz,
  -- Audit
  created_by          uuid references public.profiles (id),
  updated_by          uuid references public.profiles (id),
  deleted_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists linkedin_prospects_status_idx   on public.linkedin_prospects (status);
create index if not exists linkedin_prospects_campaign_idx on public.linkedin_prospects (campaign_id);
create index if not exists linkedin_prospects_owner_idx    on public.linkedin_prospects (owner_id);
create index if not exists linkedin_prospects_followup_idx on public.linkedin_prospects (next_followup_date);
create index if not exists linkedin_prospects_score_idx    on public.linkedin_prospects (lead_score);

-- ---------------------------------------------------------------------------
-- 4. linkedin_activities (Timeline: Kontaktanfrage/Nachricht/Antwort/...)
-- ---------------------------------------------------------------------------
create table if not exists public.linkedin_activities (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default '11111111-1111-1111-1111-111111111111'
                references public.organizations (id),
  prospect_id uuid not null references public.linkedin_prospects (id) on delete cascade,
  type        text not null
                check (type in ('kontaktanfrage','nachricht','antwort','telefonat','meeting','angebot','notiz','vertrag','status','system')),
  subject     text,
  body        text,
  occurred_at timestamptz not null default now(),
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now()
);
create index if not exists linkedin_activities_prospect_idx on public.linkedin_activities (prospect_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- 5. linkedin_message_templates (Vorlagen - Fabian prueft, KEIN Auto-Versand)
-- ---------------------------------------------------------------------------
create table if not exists public.linkedin_message_templates (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null default '11111111-1111-1111-1111-111111111111'
               references public.organizations (id),
  name       text not null,
  category   text not null default 'erste_kontaktanfrage'
               check (category in ('erste_kontaktanfrage','nach_annahme','followup','nach_gespraech','nach_angebot','reaktivierung')),
  body       text not null default '',
  variables  jsonb not null default '[]'::jsonb,
  active     boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 6. linkedin_messages (Entwuerfe + manuell versendete/erhaltene Nachrichten)
-- ---------------------------------------------------------------------------
create table if not exists public.linkedin_messages (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default '11111111-1111-1111-1111-111111111111'
                references public.organizations (id),
  prospect_id uuid not null references public.linkedin_prospects (id) on delete cascade,
  template_id uuid references public.linkedin_message_templates (id) on delete set null,
  direction   text not null default 'out' check (direction in ('out','in')),
  status      text not null default 'draft' check (status in ('draft','sent','received')),
  body        text not null default '',
  sent_at     timestamptz,
  created_by  uuid references public.profiles (id),
  updated_by  uuid references public.profiles (id),
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists linkedin_messages_prospect_idx on public.linkedin_messages (prospect_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 7. tasks: Verknuepfung zu Prospects (Follow-up-Aufgaben, Todos je Prospect)
-- ---------------------------------------------------------------------------
alter table public.tasks
  add column if not exists linkedin_prospect_id uuid references public.linkedin_prospects (id) on delete set null;
create index if not exists tasks_linkedin_prospect_idx on public.tasks (linkedin_prospect_id);

-- ===========================================================================
-- 8. Trigger
-- ===========================================================================
do $$
declare t text;
begin
  foreach t in array array['linkedin_campaigns','linkedin_prospects','linkedin_message_templates','linkedin_messages']
  loop
    execute format('drop trigger if exists set_updated_at on public.%1$s;', t);
    execute format('create trigger set_updated_at before update on public.%1$s for each row execute function public.set_updated_at();', t);
  end loop;
end $$;

drop trigger if exists stamp_created_by on public.linkedin_campaigns;
create trigger stamp_created_by before insert on public.linkedin_campaigns
  for each row execute function public.stamp_created_by_only();
drop trigger if exists stamp_created_by on public.linkedin_message_templates;
create trigger stamp_created_by before insert on public.linkedin_message_templates
  for each row execute function public.stamp_created_by_only();
drop trigger if exists stamp_created_by on public.linkedin_activities;
create trigger stamp_created_by before insert on public.linkedin_activities
  for each row execute function public.stamp_created_by_only();

drop trigger if exists stamp_actor on public.linkedin_prospects;
create trigger stamp_actor before insert on public.linkedin_prospects
  for each row execute function public.stamp_actor();
drop trigger if exists linkedin_prospects_stamp_update on public.linkedin_prospects;
create trigger linkedin_prospects_stamp_update before update on public.linkedin_prospects
  for each row execute function public.tasks_stamp_update();

drop trigger if exists stamp_actor on public.linkedin_messages;
create trigger stamp_actor before insert on public.linkedin_messages
  for each row execute function public.stamp_actor();
drop trigger if exists linkedin_messages_stamp_update on public.linkedin_messages;
create trigger linkedin_messages_stamp_update before update on public.linkedin_messages
  for each row execute function public.tasks_stamp_update();

-- Status-Validierung gegen die Registry (Text-Status wie bei outreach_messages;
-- KEIN validate_status auf Tabellen mit status_id-FK - Lehre aus Migration 0004!)
drop trigger if exists validate_status on public.linkedin_prospects;
create trigger validate_status before insert or update on public.linkedin_prospects
  for each row execute function public.validate_status('linkedin_prospect');

-- ===========================================================================
-- 9. Row Level Security - nur super_admin / ceo / cso / sales
-- ===========================================================================
do $$
declare t text;
begin
  foreach t in array array['linkedin_campaigns','linkedin_prospects','linkedin_activities','linkedin_message_templates','linkedin_messages']
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

-- ===========================================================================
-- 10. Standard-Nachrichtenvorlagen (Startpunkte, frei editierbar)
-- ===========================================================================
insert into public.linkedin_message_templates (name, category, body, variables)
select * from (values
  ('Erste Kontaktanfrage',
   'erste_kontaktanfrage',
   'Hallo {{vorname}}, ich bin auf Ihr Unternehmen {{firma}} gestossen und finde Ihren Ansatz in der Branche {{branche}} spannend. Ich wuerde mich freuen, mich mit Ihnen zu vernetzen.',
   '["vorname","firma","branche"]'::jsonb),
  ('Nach Annahme',
   'nach_annahme',
   'Danke fuer die Vernetzung, {{vorname}}! Ich unterstuetze Unternehmen wie {{firma}} dabei, online mehr Kunden zu gewinnen. Wie laeuft es bei Ihnen aktuell mit der Kundengewinnung?',
   '["vorname","firma"]'::jsonb),
  ('Follow-up',
   'followup',
   'Hallo {{vorname}}, ich wollte kurz nachfassen - hatten Sie schon Gelegenheit, ueber meine letzte Nachricht nachzudenken? Gerne zeige ich Ihnen unverbindlich, was fuer {{firma}} moeglich waere.',
   '["vorname","firma"]'::jsonb),
  ('Nach Gespraech',
   'nach_gespraech',
   'Danke fuer das gute Gespraech, {{vorname}}! Wie besprochen sende ich Ihnen die naechsten Schritte. Bei Fragen bin ich jederzeit erreichbar.',
   '["vorname"]'::jsonb),
  ('Nach Angebot',
   'nach_angebot',
   'Hallo {{vorname}}, ich hoffe, das Angebot fuer {{firma}} ist gut angekommen. Gibt es offene Fragen, die wir kurz klaeren koennen?',
   '["vorname","firma"]'::jsonb),
  ('Reaktivierung',
   'reaktivierung',
   'Hallo {{vorname}}, vor einiger Zeit hatten wir Kontakt bezueglich {{firma}}. Inzwischen hat sich bei uns einiges getan - haetten Sie Lust auf ein kurzes Update-Gespraech?',
   '["vorname","firma"]'::jsonb)
) as v(name, category, body, variables)
where not exists (select 1 from public.linkedin_message_templates);
