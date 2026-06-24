-- ===========================================================================
-- eCreator OS - Phase 7: Creator Pool, Talent Management & Shooting Staffing
-- ---------------------------------------------------------------------------
-- Internes Creator-CRM (kein Marktplatz): creators, creator_assets (Portfolio),
-- creator_availability, creator_ratings (interne Bewertungen), shoot_assignments
-- (Besetzung). Eigene Status-Saetze (creator, shoot_assignment) in der Registry.
-- Ausfuehren NACH 0006.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Registry: Creator- & Besetzungs-Status
-- ---------------------------------------------------------------------------
insert into public.statuses (entity_type, key, label, color, sort_order, is_default) values
  ('creator', 'new',        'Neu',           'gray',  1, true),
  ('creator', 'contacted',  'Kontaktiert',   'blue',  2, false),
  ('creator', 'interested', 'Interesse',     'blue',  3, false),
  ('creator', 'qualified',  'Qualifiziert',  'amber', 4, false),
  ('creator', 'pool',       'Creator Pool',  'green', 5, false),
  ('creator', 'active',     'Aktiv',         'green', 6, false),
  ('creator', 'inactive',   'Inaktiv',       'gray',  7, false),
  ('creator', 'unsuitable', 'Nicht geeignet','red',   8, false),
  ('shoot_assignment', 'requested', 'Angefragt',     'amber', 1, true),
  ('shoot_assignment', 'confirmed', 'Bestaetigt',    'green', 2, false),
  ('shoot_assignment', 'rejected',  'Abgelehnt',     'red',   3, false),
  ('shoot_assignment', 'done',      'Durchgefuehrt', 'blue',  4, false)
on conflict (entity_type, key) do nothing;

-- ---------------------------------------------------------------------------
-- 2. creators (zentrales Talent-Profil)
-- ---------------------------------------------------------------------------
create table if not exists public.creators (
  id                   uuid primary key default gen_random_uuid(),
  org_id               uuid not null default '11111111-1111-1111-1111-111111111111'
                         references public.organizations (id),
  first_name           text not null,
  last_name            text,
  email                text,
  phone                text,
  city                 text,
  canton               text,
  country              text,
  birth_year           integer,
  gender               text,
  languages            text[] not null default '{}',
  instagram_handle     text,
  instagram_followers  integer,
  tiktok_handle        text,
  tiktok_followers     integer,
  creator_types        text[] not null default '{}',   -- mehrfach
  experience_level     text,
  -- Preise in Rappen
  hourly_rate          bigint,
  half_day_rate        bigint,
  full_day_rate        bigint,
  travel_costs         bigint,
  additional_costs     bigint,
  travel_available     boolean not null default false,
  status               text not null default 'new',
  score                integer not null default 0,      -- Qualifikations-Score 0-100
  creator_group_status text not null default 'not_invited',
  tags                 text[] not null default '{}',
  -- DSG / Einwilligung
  consent_given        boolean not null default false,
  consent_date         timestamptz,
  consent_note         text,
  notes                text,
  created_by           uuid references public.profiles (id),
  updated_by           uuid references public.profiles (id),
  deleted_at           timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists creators_status_idx  on public.creators (status);
create index if not exists creators_canton_idx  on public.creators (canton);
create index if not exists creators_score_idx   on public.creators (score desc);
create index if not exists creators_types_idx   on public.creators using gin (creator_types);
create index if not exists creators_tags_idx    on public.creators using gin (tags);

-- ---------------------------------------------------------------------------
-- 3. creator_assets (Portfolio)
-- ---------------------------------------------------------------------------
create table if not exists public.creator_assets (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default '11111111-1111-1111-1111-111111111111'
                references public.organizations (id),
  creator_id  uuid not null references public.creators (id) on delete cascade,
  title       text,
  category    text,            -- photos/videos/ugc/ads/references
  file_url    text,
  tags        text[] not null default '{}',
  uploaded_by uuid references public.profiles (id),
  updated_by  uuid references public.profiles (id),
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists creator_assets_creator_idx on public.creator_assets (creator_id);

-- ---------------------------------------------------------------------------
-- 4. creator_availability
-- ---------------------------------------------------------------------------
create table if not exists public.creator_availability (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null default '11111111-1111-1111-1111-111111111111'
                      references public.organizations (id),
  creator_id        uuid not null references public.creators (id) on delete cascade,
  start_date        date not null,
  end_date          date,
  availability_type text not null default 'available',  -- available/limited/unavailable
  note              text,
  created_by        uuid references public.profiles (id),
  created_at        timestamptz not null default now()
);
create index if not exists creator_availability_creator_idx
  on public.creator_availability (creator_id, start_date);

-- ---------------------------------------------------------------------------
-- 5. creator_ratings (interne Bewertungen, 1-5 Sterne)
-- ---------------------------------------------------------------------------
create table if not exists public.creator_ratings (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null default '11111111-1111-1111-1111-111111111111'
                    references public.organizations (id),
  creator_id      uuid not null references public.creators (id) on delete cascade,
  shoot_id        uuid references public.shoots (id) on delete set null,
  punctuality     integer,
  appearance      integer,
  camera_quality  integer,
  communication   integer,
  professionalism integer,
  overall         numeric(3,2),   -- Durchschnitt der 5 Kriterien
  comment         text,
  created_by      uuid references public.profiles (id),
  created_at      timestamptz not null default now()
);
create index if not exists creator_ratings_creator_idx on public.creator_ratings (creator_id);

-- ---------------------------------------------------------------------------
-- 6. shoot_assignments (Besetzung / Staffing)
-- ---------------------------------------------------------------------------
create table if not exists public.shoot_assignments (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default '11111111-1111-1111-1111-111111111111'
                references public.organizations (id),
  shoot_id    uuid not null references public.shoots (id) on delete cascade,
  creator_id  uuid not null references public.creators (id) on delete cascade,
  status      text not null default 'requested',
  agreed_rate bigint,   -- Rappen
  note        text,
  created_by  uuid references public.profiles (id),
  updated_by  uuid references public.profiles (id),
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (shoot_id, creator_id)
);
create index if not exists shoot_assignments_shoot_idx   on public.shoot_assignments (shoot_id);
create index if not exists shoot_assignments_creator_idx on public.shoot_assignments (creator_id);
create index if not exists shoot_assignments_status_idx  on public.shoot_assignments (status);

-- ===========================================================================
-- 7. Trigger
-- ===========================================================================
drop trigger if exists set_updated_at on public.creators;
create trigger set_updated_at before update on public.creators
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.creator_assets;
create trigger set_updated_at before update on public.creator_assets
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.shoot_assignments;
create trigger set_updated_at before update on public.shoot_assignments
  for each row execute function public.set_updated_at();

drop trigger if exists stamp_actor on public.creators;
create trigger stamp_actor before insert on public.creators
  for each row execute function public.stamp_actor();
drop trigger if exists creators_stamp_update on public.creators;
create trigger creators_stamp_update before update on public.creators
  for each row execute function public.tasks_stamp_update();

drop trigger if exists stamp_uploader on public.creator_assets;
create trigger stamp_uploader before insert on public.creator_assets
  for each row execute function public.stamp_uploader();

drop trigger if exists stamp_created_by on public.creator_availability;
create trigger stamp_created_by before insert on public.creator_availability
  for each row execute function public.stamp_created_by_only();
drop trigger if exists stamp_created_by on public.creator_ratings;
create trigger stamp_created_by before insert on public.creator_ratings
  for each row execute function public.stamp_created_by_only();

drop trigger if exists stamp_actor on public.shoot_assignments;
create trigger stamp_actor before insert on public.shoot_assignments
  for each row execute function public.stamp_actor();
drop trigger if exists shoot_assignments_stamp_update on public.shoot_assignments;
create trigger shoot_assignments_stamp_update before update on public.shoot_assignments
  for each row execute function public.tasks_stamp_update();

drop trigger if exists validate_status on public.creators;
create trigger validate_status before insert or update on public.creators
  for each row execute function public.validate_status('creator');
drop trigger if exists validate_status on public.shoot_assignments;
create trigger validate_status before insert or update on public.shoot_assignments
  for each row execute function public.validate_status('shoot_assignment');

-- ===========================================================================
-- 8. Row Level Security
-- ===========================================================================
alter table public.creators             enable row level security;
alter table public.creator_assets       enable row level security;
alter table public.creator_availability enable row level security;
alter table public.creator_ratings      enable row level security;
alter table public.shoot_assignments    enable row level security;

-- creators (internes CRM: alle eingeloggten verwalten; Stempel-Trigger erzwingt created_by)
drop policy if exists "creators_select" on public.creators;
create policy "creators_select" on public.creators for select to authenticated
  using (deleted_at is null or public.is_super_admin());
drop policy if exists "creators_insert" on public.creators;
create policy "creators_insert" on public.creators for insert to authenticated with check (true);
drop policy if exists "creators_update" on public.creators;
create policy "creators_update" on public.creators for update to authenticated
  using (true) with check (true);
drop policy if exists "creators_delete" on public.creators;
create policy "creators_delete" on public.creators for delete to authenticated
  using (public.is_super_admin());

-- creator_assets
drop policy if exists "creator_assets_select" on public.creator_assets;
create policy "creator_assets_select" on public.creator_assets for select to authenticated
  using (deleted_at is null or public.is_super_admin());
drop policy if exists "creator_assets_insert" on public.creator_assets;
create policy "creator_assets_insert" on public.creator_assets for insert to authenticated with check (true);
drop policy if exists "creator_assets_update" on public.creator_assets;
create policy "creator_assets_update" on public.creator_assets for update to authenticated
  using (true) with check (true);
drop policy if exists "creator_assets_delete" on public.creator_assets;
create policy "creator_assets_delete" on public.creator_assets for delete to authenticated
  using (uploaded_by = auth.uid() or public.is_super_admin());

-- creator_availability
drop policy if exists "creator_availability_select" on public.creator_availability;
create policy "creator_availability_select" on public.creator_availability for select to authenticated
  using (true);
drop policy if exists "creator_availability_write" on public.creator_availability;
create policy "creator_availability_write" on public.creator_availability for all to authenticated
  using (true) with check (true);

-- creator_ratings (interne Bewertungen)
drop policy if exists "creator_ratings_select" on public.creator_ratings;
create policy "creator_ratings_select" on public.creator_ratings for select to authenticated
  using (true);
drop policy if exists "creator_ratings_insert" on public.creator_ratings;
create policy "creator_ratings_insert" on public.creator_ratings for insert to authenticated
  with check (created_by = auth.uid());
drop policy if exists "creator_ratings_delete" on public.creator_ratings;
create policy "creator_ratings_delete" on public.creator_ratings for delete to authenticated
  using (created_by = auth.uid() or public.is_super_admin());

-- shoot_assignments (Besetzung)
drop policy if exists "shoot_assignments_select" on public.shoot_assignments;
create policy "shoot_assignments_select" on public.shoot_assignments for select to authenticated
  using (deleted_at is null or public.is_super_admin());
drop policy if exists "shoot_assignments_insert" on public.shoot_assignments;
create policy "shoot_assignments_insert" on public.shoot_assignments for insert to authenticated with check (true);
drop policy if exists "shoot_assignments_update" on public.shoot_assignments;
create policy "shoot_assignments_update" on public.shoot_assignments for update to authenticated
  using (true) with check (true);
drop policy if exists "shoot_assignments_delete" on public.shoot_assignments;
create policy "shoot_assignments_delete" on public.shoot_assignments for delete to authenticated
  using (public.is_super_admin());
