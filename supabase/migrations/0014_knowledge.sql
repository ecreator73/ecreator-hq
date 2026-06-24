-- ===========================================================================
-- eCreator OS - Phase 14: Knowledge Base, Meeting Assistant & SOP Engine
-- ---------------------------------------------------------------------------
-- Wissenszentrale: meetings erweitert (Recording/Transcript/Summary/ToDos),
-- knowledge_articles, sops, prompt_library. Internes Wissen - alle eingeloggten
-- Teammitglieder. Ausfuehren NACH 0013.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. meetings erweitern (Meeting Assistant)
-- ---------------------------------------------------------------------------
alter table public.meetings
  add column if not exists meeting_type  text,
  add column if not exists recording_url text,
  add column if not exists transcript    text,
  add column if not exists summary       text,
  add column if not exists action_items  text;

-- ---------------------------------------------------------------------------
-- 2. knowledge_articles
-- ---------------------------------------------------------------------------
create table if not exists public.knowledge_articles (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null default '11111111-1111-1111-1111-111111111111'
               references public.organizations (id),
  title      text not null,
  content    text,
  category   text,
  tags       text[] not null default '{}',
  status     text not null default 'draft',   -- draft/published
  created_by uuid references public.profiles (id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists knowledge_articles_category_idx on public.knowledge_articles (category);
create index if not exists knowledge_articles_tags_idx on public.knowledge_articles using gin (tags);

-- ---------------------------------------------------------------------------
-- 3. sops (Standard Operating Procedures)
-- ---------------------------------------------------------------------------
create table if not exists public.sops (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null default '11111111-1111-1111-1111-111111111111'
               references public.organizations (id),
  title      text not null,
  category   text,
  steps      jsonb not null default '[]'::jsonb,   -- [{title, description}]
  status     text not null default 'active',       -- draft/active/archived
  created_by uuid references public.profiles (id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sops_category_idx on public.sops (category);

-- ---------------------------------------------------------------------------
-- 4. prompt_library (Referenz-Prompts fuer das Team - kein Engine-System)
-- ---------------------------------------------------------------------------
create table if not exists public.prompt_library (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null default '11111111-1111-1111-1111-111111111111'
               references public.organizations (id),
  title      text not null,
  category   text,
  prompt     text,
  variables  jsonb not null default '[]'::jsonb,
  tags       text[] not null default '{}',
  created_by uuid references public.profiles (id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists prompt_library_category_idx on public.prompt_library (category);
create index if not exists prompt_library_tags_idx on public.prompt_library using gin (tags);

-- ===========================================================================
-- 5. Trigger
-- ===========================================================================
do $$
declare t text;
begin
  foreach t in array array['knowledge_articles','sops','prompt_library']
  loop
    execute format('drop trigger if exists set_updated_at on public.%1$s;', t);
    execute format('create trigger set_updated_at before update on public.%1$s for each row execute function public.set_updated_at();', t);
    execute format('drop trigger if exists stamp_created_by on public.%1$s;', t);
    execute format('create trigger stamp_created_by before insert on public.%1$s for each row execute function public.stamp_created_by_only();', t);
  end loop;
end $$;

-- ===========================================================================
-- 6. Row Level Security - internes Wissen, alle eingeloggten Teammitglieder
-- ===========================================================================
do $$
declare t text;
begin
  foreach t in array array['knowledge_articles','sops','prompt_library']
  loop
    execute format('alter table public.%1$s enable row level security;', t);
    execute format('drop policy if exists "%1$s_select" on public.%1$s;', t);
    execute format('create policy "%1$s_select" on public.%1$s for select to authenticated using (deleted_at is null or public.is_super_admin());', t);
    execute format('drop policy if exists "%1$s_write" on public.%1$s;', t);
    execute format('create policy "%1$s_write" on public.%1$s for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;
