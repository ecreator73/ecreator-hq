import { getContext } from "./_helpers";
import {
  isoDay,
  monthBounds,
  addMonths,
  recurringMonthlyAmount,
  effectiveInvoiceStatus,
} from "@/lib/finance";
import type {
  FinanceSummary,
  ForecastMonth,
  CustomerValue,
  FinanceAlert,
  FinanceCalendarEvent,
  FinanceSeriesPoint,
} from "@/types/entities";

/**
 * Finance-Engine: berechnet MRR/ARR, Umsatz, Forecast, Profitabilitaet,
 * Kundenwert, Alerts und Reports ZUR LAUFZEIT aus Vertraegen, Rechnungen und
 * Kosten (nichts wird zusaetzlich gespeichert). Kein Buchhaltungs-/MWST-Modul.
 */

interface ContractRow {
  client_id: string | null;
  value_monthly: number | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  renewal_type: string | null;
  title: string | null;
}
interface InvoiceRow {
  client_id: string | null;
  amount: number | null;
  status: string;
  due_date: string | null;
  paid_date: string | null;
}
interface ExpenseRow {
  amount: number | null;
  recurring: boolean;
  recurring_frequency: string | null;
  date: string | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function loadContracts(supabase: any): Promise<ContractRow[]> {
  const { data } = await supabase
    .from("contracts")
    .select("client_id, value_monthly, status, start_date, end_date, renewal_type, title")
    .is("deleted_at", null);
  return (data ?? []) as ContractRow[];
}
async function loadInvoices(supabase: any): Promise<InvoiceRow[]> {
  const { data } = await supabase
    .from("invoices")
    .select("client_id, amount, status, due_date, paid_date")
    .is("deleted_at", null);
  return (data ?? []) as InvoiceRow[];
}
async function loadExpenses(supabase: any): Promise<ExpenseRow[]> {
  const { data } = await supabase
    .from("expenses")
    .select("amount, recurring, recurring_frequency, date")
    .is("deleted_at", null);
  return (data ?? []) as ExpenseRow[];
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function activeMrr(contracts: ContractRow[]): number {
  return contracts
    .filter((c) => c.status === "active")
    .reduce((s, c) => s + (c.value_monthly ?? 0), 0);
}

function paidRevenue(invoices: InvoiceRow[], start: string, end: string): number {
  return invoices
    .filter(
      (i) => i.status === "paid" && i.paid_date && i.paid_date >= start && i.paid_date <= end,
    )
    .reduce((s, i) => s + (i.amount ?? 0), 0);
}

function recurringMonthlyCost(expenses: ExpenseRow[]): number {
  return expenses
    .filter((e) => e.recurring)
    .reduce((s, e) => s + recurringMonthlyAmount(e.amount, e.recurring_frequency), 0);
}

/** Vertraglicher (wiederkehrender) Umsatz fuer einen Monat. */
function contractRevenueForMonth(
  contracts: ContractRow[],
  bounds: { start: string; end: string },
): number {
  return contracts
    .filter(
      (c) =>
        c.status === "active" &&
        (!c.start_date || c.start_date <= bounds.end) &&
        (!c.end_date || c.end_date >= bounds.start),
    )
    .reduce((s, c) => s + (c.value_monthly ?? 0), 0);
}

function buildForecast(
  contracts: ContractRow[],
  recCost: number,
  startOffset: number,
  count: number,
): ForecastMonth[] {
  const now = new Date();
  const out: ForecastMonth[] = [];
  for (let i = startOffset; i < startOffset + count; i++) {
    const b = monthBounds(addMonths(now, i));
    const revenue = contractRevenueForMonth(contracts, b);
    out.push({ month: b.key, revenue, cost: recCost, profit: revenue - recCost });
  }
  return out;
}

export const financeService = {
  async summary(): Promise<FinanceSummary> {
    const { supabase } = await getContext();
    const [contracts, invoices, expenses, clientsRes] = await Promise.all([
      loadContracts(supabase),
      loadInvoices(supabase),
      loadExpenses(supabase),
      supabase.from("clients").select("status").is("deleted_at", null),
    ]);

    const now = new Date();
    const today = isoDay(now);
    const m = monthBounds(now);
    const yStart = `${now.getFullYear()}-01-01`;
    const yEnd = `${now.getFullYear()}-12-31`;

    const mrr = activeMrr(contracts);
    const recCost = recurringMonthlyCost(expenses);

    let openCount = 0;
    let openAmount = 0;
    let overdueCount = 0;
    let overdueAmount = 0;
    for (const inv of invoices) {
      const eff = effectiveInvoiceStatus(inv, today);
      if (eff === "open" || eff === "overdue") {
        openCount += 1;
        openAmount += inv.amount ?? 0;
        if (eff === "overdue") {
          overdueCount += 1;
          overdueAmount += inv.amount ?? 0;
        }
      }
    }

    const fc = buildForecast(contracts, recCost, 1, 12);
    const activeClients = (
      (clientsRes.data ?? []) as Array<{ status: string }>
    ).filter((c) => c.status === "active").length;

    return {
      monthRevenue: paidRevenue(invoices, m.start, m.end),
      yearRevenue: paidRevenue(invoices, yStart, yEnd),
      mrr,
      arr: mrr * 12,
      openInvoicesCount: openCount,
      openInvoicesAmount: openAmount,
      overdueInvoicesCount: overdueCount,
      overdueInvoicesAmount: overdueAmount,
      profitEstimateMonth: mrr - recCost,
      activeClients,
      forecastNextMonth: fc[0]?.revenue ?? 0,
      forecast3Months: fc.slice(0, 3).reduce((s, f) => s + f.revenue, 0),
      forecast12Months: fc.reduce((s, f) => s + f.revenue, 0),
    };
  },

  /** Forecast inkl. aktuellem Monat + 11 Folgemonate (fuer Charts). */
  async forecast(count = 12): Promise<ForecastMonth[]> {
    const { supabase } = await getContext();
    const [contracts, expenses] = await Promise.all([
      loadContracts(supabase),
      loadExpenses(supabase),
    ]);
    return buildForecast(contracts, recurringMonthlyCost(expenses), 0, count);
  },

  async customerValues(): Promise<CustomerValue[]> {
    const { supabase } = await getContext();
    const [contracts, invoices, clientsRes] = await Promise.all([
      loadContracts(supabase),
      loadInvoices(supabase),
      supabase.from("clients").select("id, name, start_date, status").is("deleted_at", null),
    ]);
    const clients = (clientsRes.data ?? []) as Array<{
      id: string;
      name: string;
      start_date: string | null;
    }>;
    const now = new Date();

    return clients
      .map((c): CustomerValue => {
        const cInvoices = invoices.filter((i) => i.client_id === c.id);
        const totalRevenue = cInvoices
          .filter((i) => i.status === "paid")
          .reduce((s, i) => s + (i.amount ?? 0), 0);
        const openAmount = cInvoices
          .filter((i) => ["open", "overdue"].includes(i.status))
          .reduce((s, i) => s + (i.amount ?? 0), 0);
        const cContracts = contracts.filter((ct) => ct.client_id === c.id);
        const mrr = cContracts
          .filter((ct) => ct.status === "active")
          .reduce((s, ct) => s + (ct.value_monthly ?? 0), 0);
        const starts = [c.start_date, ...cContracts.map((ct) => ct.start_date)]
          .filter((d): d is string => Boolean(d))
          .sort();
        const start = starts[0];
        const runtimeMonths = start
          ? Math.max(
              1,
              (now.getFullYear() - Number(start.slice(0, 4))) * 12 +
                (now.getMonth() + 1 - Number(start.slice(5, 7))) +
                1,
            )
          : 1;
        return {
          client: { id: c.id, name: c.name },
          totalRevenue,
          mrr,
          runtimeMonths,
          avgMonthly: runtimeMonths > 0 ? Math.round(totalRevenue / runtimeMonths) : totalRevenue,
          openAmount,
        };
      })
      .sort((a, b) => b.mrr - a.mrr || b.totalRevenue - a.totalRevenue);
  },

  async alerts(): Promise<FinanceAlert[]> {
    const { supabase } = await getContext();
    const [contracts, invoices, clientsRes] = await Promise.all([
      loadContracts(supabase),
      loadInvoices(supabase),
      supabase.from("clients").select("status").is("deleted_at", null),
    ]);
    const now = new Date();
    const today = isoDay(now);
    const soon = isoDay(addMonths(now, 1));
    const alerts: FinanceAlert[] = [];

    const overdue = invoices.filter(
      (i) => effectiveInvoiceStatus(i, today) === "overdue",
    ).length;
    if (overdue > 0)
      alerts.push({
        type: "invoice_overdue",
        label: `${overdue} Rechnung(en) ueberfaellig`,
        severity: "danger",
        href: "/finance/invoices",
      });

    const expiring = contracts.filter(
      (c) => c.status === "active" && c.end_date && c.end_date >= today && c.end_date <= soon,
    ).length;
    if (expiring > 0)
      alerts.push({
        type: "contract_expiring",
        label: `${expiring} Vertrag/Vertraege laufen aus`,
        severity: "warn",
        href: "/finance/calendar",
      });

    const ended = (
      (clientsRes.data ?? []) as Array<{ status: string }>
    ).filter((c) => c.status === "ended").length;
    if (ended > 0)
      alerts.push({
        type: "client_ended",
        label: `${ended} Kunde(n) beendet`,
        severity: "info",
      });

    // Umsatzrueckgang: letzter Monat vs. Vormonat (bezahlte Rechnungen)
    const last = monthBounds(addMonths(now, -1));
    const prev = monthBounds(addMonths(now, -2));
    const lastRev = paidRevenue(invoices, last.start, last.end);
    const prevRev = paidRevenue(invoices, prev.start, prev.end);
    if (prevRev > 0 && lastRev < prevRev * 0.85)
      alerts.push({
        type: "revenue_drop",
        label: "Umsatzrueckgang gegenueber Vormonat",
        severity: "warn",
        href: "/finance/reports",
      });

    return alerts;
  },

  async calendar(from: string, to: string): Promise<FinanceCalendarEvent[]> {
    const { supabase } = await getContext();
    const [invRes, contractRes] = await Promise.all([
      supabase
        .from("invoices")
        .select("id, title, invoice_number, amount, due_date, status, client:clients!invoices_client_id_fkey(name)")
        .is("deleted_at", null)
        .in("status", ["open", "overdue", "draft"])
        .gte("due_date", from)
        .lte("due_date", to),
      supabase
        .from("contracts")
        .select("id, title, end_date, renewal_type, value_monthly, client:clients!contracts_client_id_fkey(name)")
        .is("deleted_at", null)
        .eq("status", "active")
        .gte("end_date", from)
        .lte("end_date", to),
    ]);

    const events: FinanceCalendarEvent[] = [];
    const cname = (c: unknown): string | null =>
      (c as { name?: string } | null)?.name ?? null;

    for (const i of (invRes.data ?? []) as Array<Record<string, unknown>>) {
      events.push({
        id: `invoice-${i.id as string}`,
        date: String(i.due_date).slice(0, 10),
        type: "invoice_due",
        title: `Rechnung faellig: ${(i.title as string) || (i.invoice_number as string) || "—"}`,
        href: "/finance/invoices",
        clientName: cname(i.client),
        amount: (i.amount as number) ?? null,
      });
    }
    for (const c of (contractRes.data ?? []) as Array<Record<string, unknown>>) {
      const renews = c.renewal_type === "auto";
      events.push({
        id: `contract-${c.id as string}`,
        date: String(c.end_date).slice(0, 10),
        type: renews ? "renewal" : "contract_end",
        title: `${renews ? "Verlaengerung" : "Vertragsende"}: ${(c.title as string) || "Vertrag"}`,
        href: "/clients",
        clientName: cname(c.client),
        amount: (c.value_monthly as number) ?? null,
      });
    }
    return events.sort((a, b) => a.date.localeCompare(b.date));
  },

  async reports(): Promise<{
    revenueSeries: FinanceSeriesPoint[];
    costSeries: FinanceSeriesPoint[];
    mrr: number;
    topClients: CustomerValue[];
  }> {
    const { supabase } = await getContext();
    const [contracts, invoices, expenses] = await Promise.all([
      loadContracts(supabase),
      loadInvoices(supabase),
      loadExpenses(supabase),
    ]);
    const now = new Date();
    const recCost = recurringMonthlyCost(expenses);

    const revenueSeries: FinanceSeriesPoint[] = [];
    const costSeries: FinanceSeriesPoint[] = [];
    for (let i = -11; i <= 0; i++) {
      const b = monthBounds(addMonths(now, i));
      revenueSeries.push({ month: b.key, value: paidRevenue(invoices, b.start, b.end) });
      const oneOff = expenses
        .filter((e) => !e.recurring && e.date && e.date >= b.start && e.date <= b.end)
        .reduce((s, e) => s + (e.amount ?? 0), 0);
      costSeries.push({ month: b.key, value: recCost + oneOff });
    }

    const topClients = await this.customerValues();
    return {
      revenueSeries,
      costSeries,
      mrr: activeMrr(contracts),
      topClients: topClients.slice(0, 8),
    };
  },
};
