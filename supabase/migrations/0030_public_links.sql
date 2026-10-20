-- ===========================================================================
-- 0030 Oeffentliche Links (Stufe 5): Creator-Bewerbung, Kunden-Onboarding,
-- Offerte/Vertrag online unterschreiben, Shoot-Review.
--  offers / contracts : sign_token, Unterschrift (Name, Bild, Zeit, IP, Browser)
--  shoots             : share_token fuer die Kunden-Durchsicht
--  shoot_scripts      : Rueckmeldung und Freigabe durch den Kunden
--  shoot_change_requests : Anpassungswuensche aus der Durchsicht
--  clients            : onboarding_token (persoenlicher Onboarding-Link)
--  client_onboarding_submissions : hochgeladene Dateien
--  public_form_hits   : Missbrauchsschutz (gehashte IP, kein Klartext)
--  Speicher «client-uploads» (privat) fuer Onboarding-Unterlagen
-- Oeffentliche Zugriffe laufen ausschliesslich serverseitig (Service-Rolle,
-- Token-Pruefung). Fuer anonyme Clients bleiben alle Tabellen gesperrt.
-- Im Supabase SQL-Editor ausfuehren. Idempotent. NACH 0029. Loescht nichts.
-- ===========================================================================

-- 1. Offerten ----------------------------------------------------------------
alter table public.offers
  add column if not exists legacy_id          text,
  add column if not exists offer_number       text,
  add column if not exists offer_date         date,
  add column if not exists vat_rate           numeric(4,2) not null default 8.1,
  add column if not exists duration_months    integer,
  add column if not exists start_date         date,
  add column if not exists scope              text,
  add column if not exists payment_terms      text,
  add column if not exists recipient_name     text,
  add column if not exists recipient_email    text,
  add column if not exists sent_at            timestamptz,
  add column if not exists sign_token         text,
  add column if not exists signed_at          timestamptz,
  add column if not exists signed_name        text,
  add column if not exists signature_data     text,
  add column if not exists signed_ip          text,
  add column if not exists signed_user_agent  text;
create unique index if not exists offers_sign_token_key on public.offers (sign_token) where sign_token is not null;
create unique index if not exists offers_legacy_id_key on public.offers (legacy_id) where legacy_id is not null;

-- 2. Vertraege ---------------------------------------------------------------
alter table public.contracts
  add column if not exists sign_token         text,
  add column if not exists signature_data     text,
  add column if not exists signed_ip          text,
  add column if not exists signed_user_agent  text;
create unique index if not exists contracts_sign_token_key on public.contracts (sign_token) where sign_token is not null;

-- 3. Shoot-Review -------------------------------------------------------------
alter table public.shoots add column if not exists share_token text;
create unique index if not exists shoots_share_token_key on public.shoots (share_token) where share_token is not null;

alter table public.shoot_scripts
  add column if not exists customer_feedback text,
  add column if not exists customer_decided_at timestamptz;

create table if not exists public.shoot_change_requests (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default '11111111-1111-1111-1111-111111111111' references public.organizations (id),
  shoot_id    uuid not null references public.shoots (id) on delete cascade,
  name        text,
  message     text not null,
  status      text not null default 'open' check (status in ('open', 'done')),
  done_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists shoot_change_requests_shoot_idx on public.shoot_change_requests (shoot_id, created_at desc);

-- 4. Onboarding ----------------------------------------------------------------
alter table public.clients add column if not exists onboarding_token text;
create unique index if not exists clients_onboarding_token_key on public.clients (onboarding_token) where onboarding_token is not null;
alter table public.client_onboarding_submissions add column if not exists files jsonb not null default '[]'::jsonb;

-- 5. Missbrauchsschutz ------------------------------------------------------------
create table if not exists public.public_form_hits (
  id          bigint generated always as identity primary key,
  form        text not null,
  ip_hash     text not null,
  created_at  timestamptz not null default now()
);
create index if not exists public_form_hits_idx on public.public_form_hits (form, ip_hash, created_at desc);

-- 6. Zugriff ----------------------------------------------------------------------
alter table public.shoot_change_requests enable row level security;
drop policy if exists "shoot_change_requests_rw" on public.shoot_change_requests;
create policy "shoot_change_requests_rw" on public.shoot_change_requests for all to authenticated using (true) with check (true);
alter table public.public_form_hits enable row level security;   -- nur Service-Rolle

-- 7. Speicher fuer Onboarding-Unterlagen (privat, 20 MB pro Datei) ----------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('client-uploads', 'client-uploads', false, 20971520,
        array['image/jpeg','image/png','image/webp','image/svg+xml','image/gif','application/pdf','application/zip','application/x-zip-compressed',
              'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
              'application/postscript','application/illustrator'])
on conflict (id) do update set public = false;
