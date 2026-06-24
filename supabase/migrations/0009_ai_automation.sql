-- ===========================================================================
-- eCreator OS - Phase 9: AI Foundation & Automation Layer
-- ---------------------------------------------------------------------------
-- FUNDAMENT (keine echten Engine-Calls): ai_prompts, ai_runs, automation_jobs,
-- automation_runs, integrations, webhooks. notifications existiert bereits
-- (0003) und wird NICHT dupliziert - nur eine SECURITY-DEFINER-Funktion zum
-- Erstellen von Benachrichtigungen fuer beliebige Nutzer ergaenzt.
-- Sichtbar nur fuer super_admin / ceo / developer (RLS). Credentials werden
-- verschluesselt gespeichert und NIE ans Frontend gegeben. Ausfuehren NACH 0008.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. ai_prompts (zentrale Prompt-Templates, keine hardcoded Prompts)
-- ---------------------------------------------------------------------------
create table if not exists public.ai_prompts (
  id                   uuid primary key default gen_random_uuid(),
  org_id               uuid not null default '11111111-1111-1111-1111-111111111111'
                         references public.organizations (id),
  name                 text not null,
  category             text,
  description          text,
  system_prompt        text,
  user_prompt_template text,
  variables            jsonb not null default '[]'::jsonb,  -- ["company_name", ...]
  model                text,
  temperature          numeric(3,2) not null default 0.70,
  status               text not null default 'active',      -- active/inactive
  created_by           uuid references public.profiles (id),
  updated_by           uuid references public.profiles (id),
  deleted_at           timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists ai_prompts_category_idx on public.ai_prompts (category);
create index if not exists ai_prompts_status_idx   on public.ai_prompts (status);

-- ---------------------------------------------------------------------------
-- 2. ai_runs (Protokoll jedes AI-Laufs)
-- ---------------------------------------------------------------------------
create table if not exists public.ai_runs (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null default '11111111-1111-1111-1111-111111111111'
                  references public.organizations (id),
  prompt_id     uuid references public.ai_prompts (id) on delete set null,
  entity_type   text,
  entity_id     uuid,
  input_data    jsonb,
  output_data   jsonb,
  model         text,
  status        text not null default 'pending',   -- pending/running/success/error/skipped
  error_message text,
  token_usage   integer,
  cost_estimate numeric(10,4),
  created_by    uuid references public.profiles (id),
  created_at    timestamptz not null default now()
);
create index if not exists ai_runs_prompt_idx on public.ai_runs (prompt_id);
create index if not exists ai_runs_status_idx on public.ai_runs (status);
create index if not exists ai_runs_created_idx on public.ai_runs (created_at desc);

-- ---------------------------------------------------------------------------
-- 3. automation_jobs (geplante Jobs - vorbereitet, nicht live)
-- ---------------------------------------------------------------------------
create table if not exists public.automation_jobs (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null default '11111111-1111-1111-1111-111111111111'
                 references public.organizations (id),
  name         text not null,
  type         text,           -- daily_lead_search/website_audit/...
  status       text not null default 'inactive',   -- active/paused/inactive
  schedule     text,           -- daily/weekly/monthly/manual oder Cron
  last_run_at  timestamptz,
  next_run_at  timestamptz,
  config       jsonb not null default '{}'::jsonb,
  created_by   uuid references public.profiles (id),
  updated_by   uuid references public.profiles (id),
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists automation_jobs_status_idx on public.automation_jobs (status);
create index if not exists automation_jobs_type_idx   on public.automation_jobs (type);

-- ---------------------------------------------------------------------------
-- 4. automation_runs (Lauf-Protokoll je Job)
-- ---------------------------------------------------------------------------
create table if not exists public.automation_runs (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null default '11111111-1111-1111-1111-111111111111'
                  references public.organizations (id),
  job_id        uuid not null references public.automation_jobs (id) on delete cascade,
  status        text not null default 'running',   -- running/success/error
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  result        jsonb,
  error_message text,
  logs          text,
  created_at    timestamptz not null default now()
);
create index if not exists automation_runs_job_idx on public.automation_runs (job_id, started_at desc);

-- ---------------------------------------------------------------------------
-- 5. integrations (Drittsysteme - Credentials verschluesselt)
-- ---------------------------------------------------------------------------
create table if not exists public.integrations (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid not null default '11111111-1111-1111-1111-111111111111'
                          references public.organizations (id),
  name                  text not null,
  provider              text,
  status                text not null default 'disconnected', -- connected/disconnected/configured/error
  config                jsonb not null default '{}'::jsonb,
  encrypted_credentials text,   -- NIE ans Frontend ausliefern
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists integrations_provider_idx on public.integrations (provider);

-- ---------------------------------------------------------------------------
-- 6. webhooks
-- ---------------------------------------------------------------------------
create table if not exists public.webhooks (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null default '11111111-1111-1111-1111-111111111111'
                     references public.organizations (id),
  name             text not null,
  provider         text,
  endpoint_url     text,
  status           text not null default 'inactive',
  secret           text,
  last_received_at timestamptz,
  config           jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 7. Notifications: SECURITY-DEFINER-Funktion zum Erstellen fuer beliebige
--    Nutzer (Engines/Automationen). Umgeht die user-scoped Insert-Policy
--    kontrolliert; nur privilegierte Rollen duerfen aufrufen.
-- ---------------------------------------------------------------------------
create or replace function public.create_notification(
  p_user_id     uuid,
  p_type        text,
  p_title       text,
  p_body        text default null,
  p_entity_type text default null,
  p_entity_id   uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not (
    public.is_super_admin()
    or public.has_role('ceo')
    or public.has_role('developer')
    or public.has_role('cso')
  ) then
    raise exception 'Keine Berechtigung, Benachrichtigungen zu erstellen';
  end if;
  insert into public.notifications (user_id, type, title, body, entity_type, entity_id)
  values (p_user_id, p_type, p_title, p_body, p_entity_type, p_entity_id)
  returning id into v_id;
  return v_id;
end;
$$;

-- ===========================================================================
-- 8. Trigger (updated_at + Identitaets-Stempel)
-- ===========================================================================
drop trigger if exists set_updated_at on public.ai_prompts;
create trigger set_updated_at before update on public.ai_prompts
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.automation_jobs;
create trigger set_updated_at before update on public.automation_jobs
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.integrations;
create trigger set_updated_at before update on public.integrations
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.webhooks;
create trigger set_updated_at before update on public.webhooks
  for each row execute function public.set_updated_at();

drop trigger if exists stamp_actor on public.ai_prompts;
create trigger stamp_actor before insert on public.ai_prompts
  for each row execute function public.stamp_actor();
drop trigger if exists ai_prompts_stamp_update on public.ai_prompts;
create trigger ai_prompts_stamp_update before update on public.ai_prompts
  for each row execute function public.tasks_stamp_update();

drop trigger if exists stamp_actor on public.automation_jobs;
create trigger stamp_actor before insert on public.automation_jobs
  for each row execute function public.stamp_actor();
drop trigger if exists automation_jobs_stamp_update on public.automation_jobs;
create trigger automation_jobs_stamp_update before update on public.automation_jobs
  for each row execute function public.tasks_stamp_update();

drop trigger if exists stamp_created_by on public.ai_runs;
create trigger stamp_created_by before insert on public.ai_runs
  for each row execute function public.stamp_created_by_only();

-- ===========================================================================
-- 9. Row Level Security - nur super_admin / ceo / developer
-- ===========================================================================
alter table public.ai_prompts      enable row level security;
alter table public.ai_runs         enable row level security;
alter table public.automation_jobs enable row level security;
alter table public.automation_runs enable row level security;
alter table public.integrations    enable row level security;
alter table public.webhooks        enable row level security;

-- Lese-/Schreibrechte fuer ai_prompts, ai_runs, automation_jobs, automation_runs:
-- super_admin/ceo/developer. (Audit-/Stempel-Trigger erzwingen Identitaet.)
do $$
declare t text;
begin
  foreach t in array array['ai_prompts','ai_runs','automation_jobs','automation_runs']
  loop
    execute format('drop policy if exists "%1$s_all" on public.%1$s;', t);
    execute format($f$
      create policy "%1$s_all" on public.%1$s for all to authenticated
      using (public.is_super_admin() or public.has_role('ceo') or public.has_role('developer'))
      with check (public.is_super_admin() or public.has_role('ceo') or public.has_role('developer'));
    $f$, t);
  end loop;
end $$;

-- integrations & webhooks: lesen super_admin/ceo/developer; schreiben NUR super_admin
-- (sensible Credentials/Secrets).
drop policy if exists "integrations_select" on public.integrations;
create policy "integrations_select" on public.integrations for select to authenticated
  using (public.is_super_admin() or public.has_role('ceo') or public.has_role('developer'));
drop policy if exists "integrations_write" on public.integrations;
create policy "integrations_write" on public.integrations for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "webhooks_select" on public.webhooks;
create policy "webhooks_select" on public.webhooks for select to authenticated
  using (public.is_super_admin() or public.has_role('ceo') or public.has_role('developer'));
drop policy if exists "webhooks_write" on public.webhooks;
create policy "webhooks_write" on public.webhooks for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());
