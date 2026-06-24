/** Finanz-Helfer (geteilt zwischen Services und UI). Geldwerte in Rappen. */

/** Minimal benoetigte Rechnungs-Felder fuer die Status-Ableitung. */
interface InvoiceStatusFields {
  status: string;
  due_date: string | null;
}

export function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

/** Erster/letzter Tag + Monatsschluessel eines Monats. */
export function monthBounds(d: Date): { start: string; end: string; key: string } {
  const y = d.getFullYear();
  const m = d.getMonth();
  return {
    start: isoDay(new Date(y, m, 1)),
    end: isoDay(new Date(y, m + 1, 0)),
    key: monthKey(d),
  };
}

/** Monatliches Aequivalent einer (ggf. wiederkehrenden) Kostenposition in Rappen. */
export function recurringMonthlyAmount(
  amount: number | null,
  frequency: string | null,
): number {
  if (!amount) return 0;
  switch (frequency) {
    case "quarterly":
      return Math.round(amount / 3);
    case "yearly":
      return Math.round(amount / 12);
    case "monthly":
    default:
      return amount;
  }
}

/**
 * Effektiver Rechnungs-Status: eine offene Rechnung mit Faelligkeit in der
 * Vergangenheit gilt als "ueberfaellig" (auch wenn der gespeicherte Status noch
 * "offen" ist).
 */
export function effectiveInvoiceStatus(
  inv: InvoiceStatusFields,
  today = isoDay(new Date()),
): string {
  if (inv.status === "open" && inv.due_date && inv.due_date < today) {
    return "overdue";
  }
  return inv.status;
}

export function isInvoiceOverdue(
  inv: InvoiceStatusFields,
  today = isoDay(new Date()),
): boolean {
  return effectiveInvoiceStatus(inv, today) === "overdue";
}
