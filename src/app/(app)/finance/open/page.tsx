import type { Metadata } from "next";
import Link from "next/link";
import { billingService, type BillingInvoice } from "@/server/services/billing.service";
import { BankImport } from "@/components/finance/bank-import";
import { formatCHFExact, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Finance - Offene Posten" };

const DAY = 86_400_000;
const chDate = (d: string | null | undefined) => (d ? `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}` : "–");
const BUCKETS = [
  { key: "due", label: "Noch nicht fällig", tone: "bg-sky-500" },
  { key: "d30", label: "1–30 Tage überfällig", tone: "bg-amber-400" },
  { key: "d60", label: "31–60 Tage", tone: "bg-orange-500" },
  { key: "d60p", label: "über 60 Tage", tone: "bg-rose-600" },
] as const;

function bucket(daysOver: number) {
  if (daysOver <= 0) return "due";
  if (daysOver <= 30) return "d30";
  if (daysOver <= 60) return "d60";
  return "d60p";
}

export default async function OpenItemsPage() {
  const all = await billingService.list().catch((): BillingInvoice[] => []);
  const today = new Date().toISOString().slice(0, 10);
  const items = all
    .filter((i) => i.status === "open" && i.total - i.paid > 0)
    .map((i) => {
      const over = i.due_date ? Math.floor((Date.parse(today) - Date.parse(i.due_date)) / DAY) : 0;
      return { ...i, open: i.total - i.paid, over, bucket: bucket(over) };
    })
    .sort((a, b) => b.over - a.over);
  const total = items.reduce((s, i) => s + i.open, 0);
  const byBucket = Object.fromEntries(BUCKETS.map((b) => [b.key, items.filter((i) => i.bucket === b.key).reduce((s, i) => s + i.open, 0)]));
  const byClient = [...items.reduce((m, i) => m.set(i.client?.name ?? "Ohne Kunde", (m.get(i.client?.name ?? "Ohne Kunde") ?? 0) + i.open), new Map<string, number>())].sort((a, b) => b[1] - a[1]);
  const refs = all.filter((i) => i.qr_reference && i.status !== "cancelled" && i.status !== "draft").map((i) => ({ ref: i.qr_reference!, number: i.invoice_number ?? "", open: i.total - i.paid }));

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs text-neutral-500">Offene Posten</p>
            <p className="text-3xl font-semibold tabular-nums text-neutral-900">{formatCHFExact(total)}</p>
            <p className="text-xs text-neutral-400">{items.length} freigegebene, nicht bezahlte Rechnungen (inkl. MWST)</p>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-neutral-600">
            {BUCKETS.map((b) => (
              <li key={b.key} className="inline-flex items-center gap-1.5">
                <span className={cn("h-2.5 w-2.5 rounded-sm", b.tone)} aria-hidden /> {b.label} <span className="font-medium tabular-nums text-neutral-900">{formatCHFExact(byBucket[b.key])}</span>
              </li>
            ))}
          </ul>
        </div>
        {total ? (
          <div className="mt-4 flex h-3 w-full gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Altersstruktur der offenen Posten">
            {BUCKETS.map((b) => (byBucket[b.key] ? <span key={b.key} className={b.tone} style={{ flexGrow: byBucket[b.key], flexBasis: 0 }} /> : null))}
          </div>
        ) : null}
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="overflow-x-auto rounded-xl border border-neutral-200 bg-white lg:col-span-2">
          <h2 className="border-b border-neutral-100 px-4 py-3 text-sm font-semibold text-neutral-900">Rechnungen, älteste Fälligkeit zuerst</h2>
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-neutral-500">Keine offenen Posten.</p>
          ) : (
            <table className="w-full min-w-[620px] text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wide text-neutral-500">
                <tr className="border-b border-neutral-100">
                  <th className="px-4 py-2">Rechnung</th>
                  <th className="px-3 py-2">Kunde</th>
                  <th className="px-3 py-2">Fällig</th>
                  <th className="px-3 py-2 text-right">Offen</th>
                  <th className="px-3 py-2">Stand</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {items.map((i) => (
                  <tr key={i.id} className="hover:bg-neutral-50/70">
                    <td className="px-4 py-2">
                      <Link href={`/finance/invoices/${i.id}`} className="font-medium tabular-nums text-neutral-900 hover:text-brand-700">
                        {i.invoice_number}
                      </Link>
                    </td>
                    <td className="max-w-[200px] truncate px-3 py-2 text-neutral-700">{i.client?.name ?? "–"}</td>
                    <td className="px-3 py-2 tabular-nums text-neutral-600">{chDate(i.due_date)}</td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">{formatCHFExact(i.open)}</td>
                    <td className="px-3 py-2 text-xs">
                      {i.over > 0 ? <span className="font-medium text-rose-700">{i.over} Tage überfällig</span> : <span className="text-neutral-500">fällig in {-i.over} Tagen</span>}
                      {i.reminder_stage ? <span className="ml-1.5 text-amber-700">· Mahnstufe {i.reminder_stage}</span> : null}
                      {!i.sent_at ? <span className="ml-1.5 text-neutral-400">· nicht als versendet markiert</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section className="rounded-xl border border-neutral-200 bg-white">
          <h2 className="border-b border-neutral-100 px-4 py-3 text-sm font-semibold text-neutral-900">Nach Kunde</h2>
          {byClient.length ? (
            <ul className="divide-y divide-neutral-100">
              {byClient.map(([name, v]) => (
                <li key={name} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                  <span className="truncate text-neutral-700">{name}</span>
                  <span className="shrink-0 tabular-nums font-medium">{formatCHFExact(v)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-neutral-400">–</p>
          )}
        </section>
      </div>

      <BankImport known={refs} />
    </div>
  );
}
