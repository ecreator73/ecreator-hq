-- ===========================================================================
-- 0027 Production aus dem Lovable-CRM (Stufe 3)
--  shoots              + Typ, Dauer, Verantwortlich, Schnitt, Lieferfrist, Links,
--                        Model-Honorar, Rechnungsstatus, Zeitstempel
--  shoot_scripts       Skripte je Shooting (Hook, Skript, Call to Action)
--  shoot_date_options  Terminvorschlaege mit Verfuegbarkeit Kunde/Model
--  creators            + legacy_id, Bewerbung, Foto/Video, Portfolio, Honorarvorstellung
--  creator_applications  Bewerbungen von der Creator-Landingpage
--  content_projects    + Plan, Termin, Thema, Hook, Caption, Format, Shooting
--  content_plans       Redaktionsplan je Kunde und Monat
--  content_recurring_rules  wiederkehrende Beitraege
--  crm_projects        + legacy_id, Prioritaet, Start, Fortschritt, Notizen
-- Status: Shooting «Terminsuche», «Schnitt», «Geliefert»; Content «Eingeplant».
-- Im Supabase SQL-Editor ausfuehren. Idempotent. NACH 0026. Loescht nichts.
-- ===========================================================================

-- 1. Status ------------------------------------------------------------------
insert into public.statuses (entity_type, key, label, color, sort_order, is_default) values
  ('shoot', 'date_search', 'Terminsuche', 'amber', 0, false),
  ('shoot', 'editing',     'Schnitt',     'blue',  6, false),
  ('shoot', 'delivered',   'Geliefert',   'green', 7, false),
  ('content_project', 'scheduled', 'Eingeplant', 'green', 9, false)
on conflict (entity_type, key) do nothing;
update public.statuses set sort_order = 10 where entity_type = 'content_project' and key = 'published';

-- 2. shoots --------------------------------------------------------------------
alter table public.shoots
  add column if not exists legacy_id          text,
  add column if not exists shoot_type         text,          -- monthly / launch / other
  add column if not exists duration_hours     numeric(5,2),
  add column if not exists end_date           timestamptz,
  add column if not exists address            text,
  add column if not exists description        text,
  add column if not exists content_goal       text,
  add column if not exists video_count        integer,
  add column if not exists equipment          text,
  add column if not exists responsible_id     uuid references public.profiles (id) on delete set null,
  add column if not exists editor_id          uuid references public.profiles (id) on delete set null,
  add column if not exists final_date_set     boolean not null default false,
  add column if not exists delivery_deadline  date,
  add column if not exists confirmed_at       timestamptz,
  add column if not exists completed_at       timestamptz,
  add column if not exists delivered_at       timestamptz,
  add column if not exists script_url         text,
  add column if not exists customer_drive_url text,
  add column if not exists shoot_folder_url   text,
  add column if not exists delivery_url       text,
  add column if not exists model_fee          bigint,        -- Rappen
  add column if not exists model_paid         boolean not null default false,
  add column if not exists model_paid_at      timestamptz,
  add column if not exists invoice_status     text not null default 'open',  -- open / invoiced / paid / none
  add column if not exists confirmation_notes text,
  add column if not exists review_notes       text;
create unique index if not exists shoots_legacy_id_key on public.shoots (legacy_id) where legacy_id is not null;
create index if not exists shoots_date_idx on public.shoots (shooting_date);

-- 3. Skripte -------------------------------------------------------------------
create table if not exists public.shoot_scripts (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null default '11111111-1111-1111-1111-111111111111' references public.organizations (id),
  legacy_id     text unique,
  shoot_id      uuid not null references public.shoots (id) on delete cascade,
  video_number  integer,
  title         text,
  hook          text,
  script        text,
  cta           text,
  notes         text,
  status        text not null default 'draft' check (status in ('draft', 'review', 'approved')),
  owner_id      uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists shoot_scripts_shoot_idx on public.shoot_scripts (shoot_id, video_number);

-- 4. Terminvorschlaege ------------------------------------------------------------
create table if not exists public.shoot_date_options (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null default '11111111-1111-1111-1111-111111111111' references public.organizations (id),
  legacy_id           text unique,
  shoot_id            uuid not null references public.shoots (id) on delete cascade,
  starts_at           timestamptz not null,
  customer_available  boolean,
  model_available     boolean,
  notes               text,
  created_at          timestamptz not null default now()
);
create index if not exists shoot_date_options_shoot_idx on public.shoot_date_options (shoot_id, starts_at);

-- 5. creators --------------------------------------------------------------------
alter table public.creators
  add column if not exists legacy_id        text,
  add column if not exists photo_path       text,   -- Datei im alten CRM-Speicher (noch nicht kopiert)
  add column if not exists video_path       text,
  add column if not exists portfolio_url    text,
  add column if not exists rate_expectation text;
create unique index if not exists creators_legacy_id_key on public.creators (legacy_id) where legacy_id is not null;

-- 6. Bewerbungen -------------------------------------------------------------------
create table if not exists public.creator_applications (
  id                      uuid primary key default gen_random_uuid(),
  org_id                  uuid not null default '11111111-1111-1111-1111-111111111111' references public.organizations (id),
  legacy_id               text unique,
  creator_id              uuid references public.creators (id) on delete set null,
  status                  text not null default 'new'
                            check (status in ('new', 'reviewing', 'on_hold', 'accepted', 'rejected')),
  first_name              text not null,
  last_name               text,
  email                   text,
  phone                   text,
  birth_year              integer,    -- nur Jahrgang (Datensparsamkeit)
  city                    text,
  instagram_handle        text,
  tiktok_handle           text,
  languages               text[] not null default '{}',
  experience              text,
  about                   text,
  photo_path              text,
  video_path              text,
  portfolio_url           text,
  rate_expectation        text,
  source                  text,
  utm_source              text,
  utm_medium              text,
  utm_campaign            text,
  referrer                text,
  privacy_consent         boolean not null default false,
  privacy_consent_at      timestamptz,
  decided_at              timestamptz,
  decided_by              uuid references public.profiles (id) on delete set null,
  rejection_email_sent_at timestamptz,
  on_hold_email_sent_at   timestamptz,
  notes                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index if not exists creator_applications_status_idx on public.creator_applications (status, created_at desc);
alter table public.creator_applications enable row level security;
drop policy if exists "creator_applications_rw" on public.creator_applications;
create policy "creator_applications_rw" on public.creator_applications for all to authenticated
  using (public.is_super_admin() or public.has_role('ceo') or public.has_role('cso') or public.has_role('project_manager') or public.has_role('creative'))
  with check (public.is_super_admin() or public.has_role('ceo') or public.has_role('cso') or public.has_role('project_manager') or public.has_role('creative'));

-- 7. Redaktionsplaene ----------------------------------------------------------------
create table if not exists public.content_plans (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null default '11111111-1111-1111-1111-111111111111' references public.organizations (id),
  legacy_id       text unique,
  client_id       uuid references public.clients (id) on delete cascade,
  year            integer not null,
  month           integer not null check (month between 1 and 12),
  responsible_id  uuid references public.profiles (id) on delete set null,
  status          text not null default 'planning' check (status in ('planning', 'in_review', 'approved', 'done')),
  notes           text,
  created_by      uuid references public.profiles (id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists content_plans_period_idx on public.content_plans (year, month);

create table if not exists public.content_recurring_rules (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null default '11111111-1111-1111-1111-111111111111' references public.organizations (id),
  legacy_id     text unique,
  client_id     uuid references public.clients (id) on delete cascade,
  workspace     text not null default 'client',   -- client / ecreator (eigene Kanaele)
  title         text not null,
  topic         text,
  platform      text,
  format        text,
  weekday       integer check (weekday between 0 and 6),
  publish_time  time,
  assignee_id   uuid references public.profiles (id) on delete set null,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 8. content_projects -----------------------------------------------------------------
alter table public.content_projects
  add column if not exists legacy_id          text,
  add column if not exists plan_id            uuid references public.content_plans (id) on delete set null,
  add column if not exists shoot_id           uuid references public.shoots (id) on delete set null,
  add column if not exists workspace          text not null default 'client',   -- client / ecreator
  add column if not exists format             text,
  add column if not exists topic              text,
  add column if not exists hook               text,
  add column if not exists description        text,
  add column if not exists caption            text,
  add column if not exists hashtags           text,
  add column if not exists script_url         text,
  add column if not exists scheduled_for      timestamptz,
  add column if not exists published_at       timestamptz,
  add column if not exists reminder_lead_days integer,
  add column if not exists performance_notes  text;
create unique index if not exists content_projects_legacy_id_key on public.content_projects (legacy_id) where legacy_id is not null;
create index if not exists content_projects_scheduled_idx on public.content_projects (scheduled_for);

-- 9. crm_projects ----------------------------------------------------------------------
alter table public.crm_projects
  add column if not exists legacy_id   text,
  add column if not exists priority    text,
  add column if not exists start_date  date,
  add column if not exists progress    integer not null default 0 check (progress between 0 and 100),
  add column if not exists notes       text;
create unique index if not exists crm_projects_legacy_id_key on public.crm_projects (legacy_id) where legacy_id is not null;

-- 10. RLS fuer die neuen Produktionstabellen (Team-kollaborativ wie Meilensteine) -------
do $$
declare t text;
begin
  foreach t in array array['shoot_scripts','shoot_date_options','content_plans','content_recurring_rules']
  loop
    execute format('alter table public.%1$s enable row level security;', t);
    execute format('drop policy if exists "%1$s_select" on public.%1$s;', t);
    execute format('create policy "%1$s_select" on public.%1$s for select to authenticated using (true);', t);
    execute format('drop policy if exists "%1$s_write" on public.%1$s;', t);
    execute format('create policy "%1$s_write" on public.%1$s for all to authenticated using (true) with check (true);', t);
  end loop;
  foreach t in array array['shoot_scripts','content_plans','content_recurring_rules','creator_applications']
  loop
    execute format('drop trigger if exists set_updated_at on public.%1$s;', t);
    execute format('create trigger set_updated_at before update on public.%1$s for each row execute function public.set_updated_at();', t);
  end loop;
end $$;
