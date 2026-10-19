import { cache } from "react";
import { getContext } from "./_helpers";
import { ARCHIVE_STATUSES, OUTCOME_BY_KEY, zurichTodayIso } from "@/lib/lead-workflow";

/**
 * Lead-Arbeit: Arbeitsliste nach naechstem Schritt, Anruf-Kennzahlen,
 * Kampagnen- und Team-Auswertung. Liest mit der Session (RLS).
 * Anrufe = sales_activities mit type «call» (inkl. Lovable-Import).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface WorkLead {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  campaign: string | null;
  dienstleistung: string | null;
  status: { key: string; label: string; color: string } | null;
  ownerId: string | null;
  owner: string | null;
  nextAction: string | null;
  nextActionDate: string | null;
  createdAt: string;
  lastCallAt: string | null;
  lastOutcome: string | null;
  lastCaller: string | null;
  attempts: number;
  noAnswers: number;
  bucket: "overdue" | "today" | "planned" | "none" | "archive";
}

export interface CallRow {
  leadId: string;
  at: string;
  outcome: string | null;
  byId: string | null;
  by: string | null;
}

const LEAD_COLS =
  "id, contact_name, company_name, email, phone, source, campaign_name, dienstleistung, next_action, next_action_date, created_at, owner_id, assigned_to_name, status:statuses!leads_status_id_fkey(key,label,color), owner:profiles!leads_owner_id_fkey(id,full_name)";

/** Alle Leads + Anrufe einmal pro Request laden; alle Ansichten rechnen darauf. */
export const loadLeadWork = cache(async () => {
  const { supabase } = await getContext();
  const today = zurichTodayIso();
  const [leadsRes, callsRes] = await Promise.all([
    supabase.from("leads").select(LEAD_COLS).is("deleted_at", null).order("created_at", { ascending: false }).limit(5000),
    supabase
      .from("sales_activities")
      .select("lead_id, activity_date, outcome, created_by, author_name, author:profiles!sales_activities_created_by_fkey(full_name)")
      .eq("type", "call")
      .order("activity_date", { ascending: false })
      .limit(20000),
  ]);
  // Fallback ohne Profil-Join, falls der Fremdschluesselname abweicht
  let callData = callsRes.data as any[] | null;
  if (callsRes.error) {
    const r = await supabase.from("sales_activities").select("lead_id, activity_date, outcome, created_by, author_name").eq("type", "call").order("activity_date", { ascending: false }).limit(20000);
    callData = r.data as any[] | null;
  }
  const calls: CallRow[] = (callData ?? []).map((c) => ({
    leadId: c.lead_id,
    at: c.activity_date,
    outcome: c.outcome ?? null,
    byId: c.created_by ?? null,
    by: c.author?.full_name ?? c.author_name ?? null,
  }));
  const byLead = new Map<string, CallRow[]>();
  for (const c of calls) {
    const list = byLead.get(c.leadId) ?? [];
    list.push(c);
    byLead.set(c.leadId, list);
  }

  const leads: WorkLead[] = ((leadsRes.data ?? []) as any[]).map((l) => {
    const cs = byLead.get(l.id) ?? [];
    const last = cs[0];
    const statusKey = l.status?.key ?? "";
    const d = l.next_action_date as string | null;
    const bucket: WorkLead["bucket"] = ARCHIVE_STATUSES.includes(statusKey)
      ? "archive"
      : !d
        ? "none"
        : d < today
          ? "overdue"
          : d === today
            ? "today"
            : "planned";
    return {
      id: l.id,
      name: l.contact_name || l.company_name,
      company: l.company_name && l.company_name !== l.contact_name ? l.company_name : null,
      email: l.email,
      phone: l.phone,
      source: l.source,
      campaign: l.campaign_name,
      dienstleistung: l.dienstleistung,
      status: l.status ?? null,
      ownerId: l.owner?.id ?? l.owner_id ?? null,
      owner: l.owner?.full_name ?? l.assigned_to_name ?? null,
      nextAction: l.next_action,
      nextActionDate: d,
      createdAt: l.created_at,
      lastCallAt: last?.at ?? null,
      lastOutcome: last?.outcome ?? null,
      lastCaller: last?.by ?? null,
      attempts: cs.length,
      noAnswers: cs.filter((c) => c.outcome === "no_answer").length,
      bucket,
    };
  });
  return { leads, calls, today };
});

export interface CallStats {
  calls: number;
  leadsContacted: number;
  reached: number;
  reachRate: number | null;
  appointments: number;
  won: number;
  closeRate: number | null;
}

export function callStats(calls: CallRow[], from: string, to: string): CallStats {
  const inRange = calls.filter((c) => c.at.slice(0, 10) >= from && c.at.slice(0, 10) <= to);
  const reached = inRange.filter((c) => c.outcome && OUTCOME_BY_KEY[c.outcome]?.reached).length;
  const leadsContacted = new Set(inRange.map((c) => c.leadId)).size;
  const won = new Set(inRange.filter((c) => c.outcome === "won").map((c) => c.leadId)).size;
  return {
    calls: inRange.length,
    leadsContacted,
    reached,
    reachRate: inRange.length ? reached / inRange.length : null,
    appointments: inRange.filter((c) => c.outcome === "appointment").length,
    won,
    closeRate: leadsContacted ? won / leadsContacted : null,
  };
}

const dayIso = (offset: number, today: string) => {
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

export function periods(today: string) {
  const d = new Date(`${today}T12:00:00Z`);
  const monday = dayIso(-((d.getUTCDay() + 6) % 7), today);
  return {
    today: { from: today, to: today, label: "Heute" },
    week: { from: monday, to: today, label: "Diese Woche" },
    month: { from: `${today.slice(0, 7)}-01`, to: today, label: "Dieser Monat" },
    d30: { from: dayIso(-29, today), to: today, label: "30 Tage" },
  };
}

export interface CampaignRow {
  campaign: string;
  source: string | null;
  leads: number;
  open: number;
  contacted: number;
  appointments: number;
  won: number;
  lost: number;
  invalid: number;
  contactRate: number | null;
  appointmentRate: number | null;
  winRate: number | null;
  first: string;
  last: string;
}

export function campaignRows(leads: WorkLead[]): CampaignRow[] {
  const map = new Map<string, WorkLead[]>();
  for (const l of leads) {
    const k = l.campaign?.trim() || "Ohne Kampagne";
    map.set(k, [...(map.get(k) ?? []), l]);
  }
  return [...map.entries()].map(([campaign, ls]) => {
    const key = (l: WorkLead) => l.status?.key ?? "";
    const contacted = ls.filter((l) => l.attempts > 0 || !["neu", "massenmail"].includes(key(l))).length;
    const appointments = ls.filter((l) => ["termin_gebucht", "vertrag_mail", "abgeschlossen"].includes(key(l))).length;
    const won = ls.filter((l) => key(l) === "abgeschlossen").length;
    const sources = new Map<string, number>();
    for (const l of ls) if (l.source) sources.set(l.source, (sources.get(l.source) ?? 0) + 1);
    const dates = ls.map((l) => l.createdAt).sort();
    return {
      campaign,
      source: [...sources.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
      leads: ls.length,
      open: ls.filter((l) => l.bucket !== "archive").length,
      contacted,
      appointments,
      won,
      lost: ls.filter((l) => key(l) === "absage").length,
      invalid: ls.filter((l) => key(l) === "fehleintrag").length,
      contactRate: ls.length ? contacted / ls.length : null,
      appointmentRate: ls.length ? appointments / ls.length : null,
      winRate: ls.length ? won / ls.length : null,
      first: dates[0] ?? "",
      last: dates[dates.length - 1] ?? "",
    };
  });
}

export interface TeamRow {
  id: string;
  name: string;
  open: number;
  overdue: number;
  withoutNext: number;
  calls7: number;
  calls30: number;
  reachRate30: number | null;
  appointments30: number;
  won30: number;
}

export function teamRows(leads: WorkLead[], calls: CallRow[], members: Array<{ id: string; full_name: string | null }>, today: string): TeamRow[] {
  const d7 = dayIso(-6, today);
  const d30 = dayIso(-29, today);
  const rows: TeamRow[] = members.map((m) => {
    const mine = leads.filter((l) => l.ownerId === m.id && l.bucket !== "archive");
    // Importierte Anrufe haben nur den Namen (kein Konto) -> auch ueber den Namen zuordnen
    const myCalls = calls.filter((c) => c.byId === m.id || (!c.byId && c.by && c.by === m.full_name));
    const c30 = myCalls.filter((c) => c.at.slice(0, 10) >= d30);
    const reached = c30.filter((c) => c.outcome && OUTCOME_BY_KEY[c.outcome]?.reached).length;
    return {
      id: m.id,
      name: m.full_name ?? "–",
      open: mine.length,
      overdue: mine.filter((l) => l.bucket === "overdue").length,
      withoutNext: mine.filter((l) => l.bucket === "none").length,
      calls7: myCalls.filter((c) => c.at.slice(0, 10) >= d7).length,
      calls30: c30.length,
      reachRate30: c30.length ? reached / c30.length : null,
      appointments30: c30.filter((c) => c.outcome === "appointment").length,
      won30: new Set(c30.filter((c) => c.outcome === "won").map((c) => c.leadId)).size,
    };
  });
  const unassigned = leads.filter((l) => !l.ownerId && l.bucket !== "archive");
  rows.push({
    id: "none",
    name: "Nicht zugewiesen",
    open: unassigned.length,
    overdue: unassigned.filter((l) => l.bucket === "overdue").length,
    withoutNext: unassigned.filter((l) => l.bucket === "none").length,
    calls7: 0,
    calls30: 0,
    reachRate30: null,
    appointments30: 0,
    won30: 0,
  });
  return rows;
}
