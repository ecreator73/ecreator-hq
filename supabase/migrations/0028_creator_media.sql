-- ===========================================================================
-- 0028 Creator-Medien (Fotos, Videos, Sedcards) in eCreator OS
--  Privater Speicher «creator-media»: kein direkter Zugriff fuer Browser-Clients,
--  die App liefert zeitlich begrenzte Links (nur Leitung, Projektleitung, Creative).
--  creators / creator_applications: photo_file, video_file = Pfad im Speicher.
--  photo_path / video_path bleiben die Herkunft im alten CRM.
-- Im Supabase SQL-Editor ausfuehren. Idempotent. NACH 0027. Loescht nichts.
-- ===========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('creator-media', 'creator-media', false, 524288000,
        array['image/jpeg','image/png','image/webp','image/heic','video/mp4','video/quicktime','application/pdf'])
on conflict (id) do update set public = false;

alter table public.creators
  add column if not exists photo_file text,
  add column if not exists video_file text;

alter table public.creator_applications
  add column if not exists photo_file text,
  add column if not exists video_file text;
