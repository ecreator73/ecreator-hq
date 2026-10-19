-- ===========================================================================
-- eCreator OS - Lead-Arbeit wie im Lovable-CRM: naechster Schritt + Anrufe
-- ---------------------------------------------------------------------------
--  leads.next_action           Was als Naechstes passiert («Nochmals anrufen», …)
--  sales_activities.outcome    Anruf-Ergebnis (no_answer, reached, interested,
--                              follow_up, appointment, offer, not_interested,
--                              wrong_number, lost, won)
--  sales_activities.duration_seconds, next_action, next_action_date
-- Im Supabase SQL-Editor ausfuehren. Idempotent. NACH 0024. Loescht nichts.
-- ===========================================================================

alter table public.leads add column if not exists next_action text;

alter table public.sales_activities
  add column if not exists outcome          text,
  add column if not exists duration_seconds integer,
  add column if not exists next_action      text,
  add column if not exists next_action_date date;

create index if not exists sales_activities_lead_type_idx
  on public.sales_activities (lead_id, type, activity_date desc);
create index if not exists sales_activities_type_date_idx
  on public.sales_activities (type, activity_date desc);
create index if not exists leads_next_action_date_idx
  on public.leads (next_action_date) where deleted_at is null;
