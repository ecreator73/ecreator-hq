import { getContext, ServiceError } from "./_helpers";
import type {
  Client,
  ClientWithStats,
  ClientWarning,
  ProfileMini,
} from "@/types/entities";

const NO_CONTACT_DAYS = 30;
const EXPIRING_DAYS = 30;
const MANY_TASKS = 5;

function nowMinusDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function inDaysDateISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface ClientFilters {
  status?: string;
  account_manager_id?: string;
  industry?: string;
  search?: string;
}

interface ClientAux {
  mrr: Map<string, number>;
  expiring: Set<string>;
  openTasks: Map<string, number>;
  lastContact: Map<string, string>;
  nextReporting: Map<string, string>;
  blockedProjects: Set<string>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadAux(supabase: any, ids: string[]): Promise<ClientAux> {
  const today = todayISO();
  const soon = inDaysDateISO(EXPIRING_DAYS);
  const [contractsRes, tasksRes, interRes, reportRes, projRes] =
    await Promise.all([
      supabase
        .from("contracts")
        .select("client_id, value_monthly, end_date, status")
        .is("deleted_at", null)
        .eq("status", "active")
        .in("client_id", ids),
      supabase
        .from("tasks")
        .select("client_id, status:statuses!tasks_status_id_fkey(key)")
        .is("deleted_at", null)
        .in("client_id", ids),
      supabase
        .from("client_interactions")
        .select("client_id, interaction_date")
        .in("client_id", ids)
        .order("interaction_date", { ascending: false }),
      supabase
        .from("reporting_calls")
        .select("client_id, scheduled_date")
        .is("deleted_at", null)
        .in("status", ["open", "scheduled"])
        .in("client_id", ids)
        .order("scheduled_date", { ascending: true }),
      supabase
        .from("projects")
        .select("client_id, status")
        .is("deleted_at", null)
        .eq("status", "on_hold")
        .in("client_id", ids),
    ]);

  const mrr = new Map<string, number>();
  const expiring = new Set<string>();
  for (const c of (contractsRes.data ?? []) as Array<{
    client_id: string;
    value_monthly: number | null;
    end_date: string | null;
  }>) {
    mrr.set(c.client_id, (mrr.get(c.client_id) ?? 0) + (c.value_monthly ?? 0));
    if (c.end_date && c.end_date >= today && c.end_date <= soon)
      expiring.add(c.client_id);
  }

  const openTasks = new Map<string, number>();
  for (const t of (tasksRes.data ?? []) as Array<{
    client_id: string | null;
    status: { key: string } | null;
  }>) {
    if (!t.client_id) continue;
    const k = t.status?.key;
    if (k === "done" || k === "archived") continue;
    openTasks.set(t.client_id, (openTasks.get(t.client_id) ?? 0) + 1);
  }

  const lastContact = new Map<string, string>();
  for (const i of (interRes.data ?? []) as Array<{
    client_id: string;
    interaction_date: string;
  }>) {
    if (!lastContact.has(i.client_id))
      lastContact.set(i.client_id, i.interaction_date);
  }

  const nextReporting = new Map<string, string>();
  for (const r of (reportRes.data ?? []) as Array<{
    client_id: string;
    scheduled_date: string | null;
  }>) {
    if (!r.scheduled_date) continue;
    if (r.scheduled_date.slice(0, 10) < today) continue;
    if (!nextReporting.has(r.client_id))
      nextReporting.set(r.client_id, r.scheduled_date);
  }

  const blockedProjects = new Set<string>();
  for (const p of (projRes.data ?? []) as Array<{ client_id: string | null }>) {
    if (p.client_id) blockedProjects.add(p.client_id);
  }

  return { mrr, expiring, openTasks, lastContact, nextReporting, blockedProjects };
}

function buildWarnings(
  client: Client,
  aux: ClientAux,
  lastContact: string | null,
  nextReporting: string | null,
  openTasks: number,
): ClientWarning[] {
  const warnings: ClientWarning[] = [];
  if (client.status !== "active") return warnings;
  const threshold = nowMinusDaysISO(NO_CONTACT_DAYS);
  if (!lastContact || lastContact < threshold)
    warnings.push({ type: "no_contact", label: "Kein Kontakt seit 30 Tagen", severity: "warn" });
  if (!nextReporting)
    warnings.push({ type: "no_reporting", label: "Kein Reporting-Call geplant", severity: "warn" });
  if (aux.expiring.has(client.id))
    warnings.push({ type: "contract_expiring", label: "Vertrag laeuft bald aus", severity: "danger" });
  if (openTasks >= MANY_TASKS)
    warnings.push({ type: "many_tasks", label: `${openTasks} offene Aufgaben`, severity: "info" });
  if (aux.blockedProjects.has(client.id))
    warnings.push({ type: "project_blocked", label: "Projekt blockiert", severity: "warn" });
  return warnings;
}

function compose(
  client: Client & { account_manager?: ProfileMini | null },
  aux: ClientAux,
): ClientWithStats {
  const lc = aux.lastContact.get(client.id) ?? null;
  const nr = aux.nextReporting.get(client.id) ?? null;
  const ot = aux.openTasks.get(client.id) ?? 0;
  return {
    ...client,
    mrr: aux.mrr.get(client.id) ?? 0,
    open_tasks: ot,
    last_contact: lc,
    next_reporting: nr,
    account_manager: client.account_manager ?? null,
    warnings: buildWarnings(client, aux, lc, nr, ot),
  };
}

export const clientsOpsService = {
  async listWithStats(filters: ClientFilters = {}): Promise<ClientWithStats[]> {
    const { supabase } = await getContext();
    let cq = supabase
      .from("clients")
      .select(
        "*, account_manager:profiles!clients_account_manager_id_fkey(id,full_name)",
      )
      .is("deleted_at", null)
      .order("name", { ascending: true });
    if (filters.status) cq = cq.eq("status", filters.status);
    if (filters.account_manager_id)
      cq = cq.eq("account_manager_id", filters.account_manager_id);
    if (filters.industry) cq = cq.eq("industry", filters.industry);
    if (filters.search) {
      const like = `%${filters.search.trim()}%`;
      cq = cq.or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like}`);
    }
    const { data, error } = await cq.limit(500);
    if (error) throw new ServiceError("Kunden konnten nicht geladen werden", error);
    const clients = (data ?? []) as Array<
      Client & { account_manager: ProfileMini | null }
    >;
    if (clients.length === 0) return [];
    const aux = await loadAux(supabase, clients.map((c) => c.id));
    return clients.map((c) => compose(c, aux));
  },

  async getWithStats(id: string): Promise<ClientWithStats | null> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("clients")
      .select(
        "*, account_manager:profiles!clients_account_manager_id_fkey(id,full_name)",
      )
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new ServiceError("Kunde konnte nicht geladen werden", error);
    if (!data) return null;
    const client = data as Client & { account_manager: ProfileMini | null };
    const aux = await loadAux(supabase, [id]);
    return compose(client, aux);
  },

  async dashboard(): Promise<{
    active: number;
    onboarding: number;
    paused: number;
    ended: number;
    totalMrr: number;
    contractsExpiring: number;
    withOpenTasks: number;
    noContact: number;
    reportingThisWeek: number;
    reportingThisMonth: number;
  }> {
    const all = await this.listWithStats({});
    const active = all.filter((c) => c.status === "active");
    const totalMrr = active.reduce((s, c) => s + c.mrr, 0);
    const today = todayISO();
    const weekEnd = inDaysDateISO(7);
    const monthEnd = inDaysDateISO(30);
    const reportingThisWeek = all.filter(
      (c) => c.next_reporting && c.next_reporting.slice(0, 10) <= weekEnd && c.next_reporting.slice(0, 10) >= today,
    ).length;
    const reportingThisMonth = all.filter(
      (c) => c.next_reporting && c.next_reporting.slice(0, 10) <= monthEnd && c.next_reporting.slice(0, 10) >= today,
    ).length;
    return {
      active: active.length,
      onboarding: all.filter((c) => c.status === "onboarding").length,
      paused: all.filter((c) => c.status === "paused").length,
      ended: all.filter((c) => c.status === "ended").length,
      totalMrr,
      contractsExpiring: all.filter((c) =>
        c.warnings.some((w) => w.type === "contract_expiring"),
      ).length,
      withOpenTasks: all.filter((c) => c.open_tasks > 0).length,
      noContact: all.filter((c) =>
        c.warnings.some((w) => w.type === "no_contact"),
      ).length,
      reportingThisWeek,
      reportingThisMonth,
    };
  },
};
