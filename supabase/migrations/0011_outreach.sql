-- ===========================================================================
-- eCreator OS - Phase 11: Outreach Engine, Follow-Ups & Terminbuchung
-- ---------------------------------------------------------------------------
-- Aus Opportunities echte Gespraeche machen - personalisierte ENTWUERFE,
-- Follow-ups, Antwort-Tracking, Termine. KEIN Blind-Massenversand. Neu:
-- outreach_campaigns, email_templates, outreach_contacts, outreach_messages,
-- follow_up_sequences, booked_meetings, unsubscribes.
-- Nur super_admin/ceo/cso/sales. Ausfuehren NACH 0010.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Registry: Nachrichten- & Termin-Status
-- ---------------------------------------------------------------------------
insert into public.statuses (entity_type, key, label, color, sort_order, is_default) values
  ('outreach_message', 'draft',       'Entwurf',       'gray',  1, true),
  ('outreach_message', 'scheduled',   'Geplant',       'blue',  2, false),
  ('outreach_message', 'sent',        'Gesendet',      'blue',  3, false),
  ('outreach_message', 'opened',      'Geoeffnet',     'amber', 4, false),
  ('outreach_message', 'replied',     'Beantwortet',   'amber', 5, false),
  ('outreach_message', 'positive',    'Positiv',       'green', 6, false),
  ('outreach_message', 'negative',    'Negativ',       'red',   7, false),
  ('outreach_message', 'no_interest', 'Kein Interesse','gray',  8, false),
  ('booked_meeting', 'requested', 'Angefragt',     'amber', 1, true),
  ('booked_meeting', 'confirmed', 'Bestaetigt',    'green', 2, false),
  ('booked_meeting', 'done',      'Durchgefuehrt', 'blue',  3, false),
  ('booked_meeting', 'cancelled', 'Abgesagt',      'red',   4, false)
on conflict (entity_type, key) do nothing;

-- ---------------------------------------------------------------------------
-- 2. outreach_campaigns
-- ---------------------------------------------------------------------------
create table if not exists public.outreach_campaigns (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null default '11111111-1111-1111-1111-111111111111'
                  references public.organizations (id),
  name          text not null,
  campaign_type text,
  status        text not null default 'draft',
  created_by    uuid references public.profiles (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. email_templates
-- ---------------------------------------------------------------------------
create table if not exists public.email_templates (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null default '11111111-1111-1111-1111-111111111111'
               references public.organizations (id),
  name       text not null,
  category   text,
  subject    text,
  body       text,
  variables  jsonb not null default '[]'::jsonb,
  active     boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4. outreach_contacts
-- ---------------------------------------------------------------------------
create table if not exists public.outreach_contacts (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null default '11111111-1111-1111-1111-111111111111'
                      references public.organizations (id),
  lead_id           uuid references public.leads (id) on delete cascade,
  email             text,
  phone             text,
  first_name        text,
  last_name         text,
  status            text not null default 'active',  -- active/unsubscribed/bounced
  last_contacted_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists outreach_contacts_lead_idx on public.outreach_contacts (lead_id);

-- ---------------------------------------------------------------------------
-- 5. outreach_messages
-- ---------------------------------------------------------------------------
create table if not exists public.outreach_messages (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default '11111111-1111-1111-1111-111111111111'
                references public.organizations (id),
  lead_id     uuid references public.leads (id) on delete set null,
  campaign_id uuid references public.outreach_campaigns (id) on delete set null,
  template_id uuid references public.email_templates (id) on delete set null,
  subject     text,
  body        text,
  status      text not null default 'draft',
  sent_at     timestamptz,
  opened_at   timestamptz,
  replied_at  timestamptz,
  created_by  uuid references public.profiles (id),
  updated_by  uuid references public.profiles (id),
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists outreach_messages_lead_idx     on public.outreach_messages (lead_id);
create index if not exists outreach_messages_campaign_idx on public.outreach_messages (campaign_id);
create index if not exists outreach_messages_status_idx   on public.outreach_messages (status);

-- ---------------------------------------------------------------------------
-- 6. follow_up_sequences
-- ---------------------------------------------------------------------------
create table if not exists public.follow_up_sequences (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default '11111111-1111-1111-1111-111111111111'
                references public.organizations (id),
  name        text not null,
  active      boolean not null default true,
  description text,
  steps       jsonb not null default '[]'::jsonb,   -- [{day, label}]
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 7. booked_meetings
-- ---------------------------------------------------------------------------
create table if not exists public.booked_meetings (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null default '11111111-1111-1111-1111-111111111111'
               references public.organizations (id),
  lead_id    uuid references public.leads (id) on delete set null,
  title      text,
  date       timestamptz,
  status     text not null default 'requested',
  source     text,           -- manual/calendly/google
  notes      text,
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists booked_meetings_lead_idx on public.booked_meetings (lead_id);
create index if not exists booked_meetings_date_idx on public.booked_meetings (date);

-- ---------------------------------------------------------------------------
-- 8. unsubscribes (Opt-out - NIE erneut kontaktieren)
-- ---------------------------------------------------------------------------
create table if not exists public.unsubscribes (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null default '11111111-1111-1111-1111-111111111111'
                   references public.organizations (id),
  email          text not null,
  reason         text,
  unsubscribed_at timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  unique (org_id, email)
);
create index if not exists unsubscribes_email_idx on public.unsubscribes (email);

-- ===========================================================================
-- 9. Trigger
-- ===========================================================================
do $$
declare t text;
begin
  foreach t in array array['outreach_campaigns','email_templates','outreach_contacts','outreach_messages','follow_up_sequences','booked_meetings']
  loop
    execute format('drop trigger if exists set_updated_at on public.%1$s;', t);
    execute format('create trigger set_updated_at before update on public.%1$s for each row execute function public.set_updated_at();', t);
  end loop;
end $$;

drop trigger if exists stamp_created_by on public.outreach_campaigns;
create trigger stamp_created_by before insert on public.outreach_campaigns
  for each row execute function public.stamp_created_by_only();
drop trigger if exists stamp_created_by on public.email_templates;
create trigger stamp_created_by before insert on public.email_templates
  for each row execute function public.stamp_created_by_only();
drop trigger if exists stamp_created_by on public.follow_up_sequences;
create trigger stamp_created_by before insert on public.follow_up_sequences
  for each row execute function public.stamp_created_by_only();

drop trigger if exists stamp_actor on public.outreach_messages;
create trigger stamp_actor before insert on public.outreach_messages
  for each row execute function public.stamp_actor();
drop trigger if exists outreach_messages_stamp_update on public.outreach_messages;
create trigger outreach_messages_stamp_update before update on public.outreach_messages
  for each row execute function public.tasks_stamp_update();
drop trigger if exists stamp_actor on public.booked_meetings;
create trigger stamp_actor before insert on public.booked_meetings
  for each row execute function public.stamp_actor();
drop trigger if exists booked_meetings_stamp_update on public.booked_meetings;
create trigger booked_meetings_stamp_update before update on public.booked_meetings
  for each row execute function public.tasks_stamp_update();

drop trigger if exists validate_status on public.outreach_messages;
create trigger validate_status before insert or update on public.outreach_messages
  for each row execute function public.validate_status('outreach_message');
drop trigger if exists validate_status on public.booked_meetings;
create trigger validate_status before insert or update on public.booked_meetings
  for each row execute function public.validate_status('booked_meeting');

-- ===========================================================================
-- 10. Row Level Security - nur super_admin / ceo / cso / sales
-- ===========================================================================
do $$
declare t text;
begin
  foreach t in array array['outreach_campaigns','email_templates','outreach_contacts','outreach_messages','follow_up_sequences','booked_meetings','unsubscribes']
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
