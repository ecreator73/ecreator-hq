import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/marketing/page-head";
import { Panel, SchemaMissing } from "@/components/marketing/ui";
import { formatAgo, formatDateTime } from "@/lib/marketing/range";
import { cn } from "@/lib/utils";
import { getSourceStatuses, listActivity, schemaReady } from "@/server/marketing/dashboard.service";
import { one, type SearchParams } from "../_shared";

export const metadata: Metadata = { title: "Live-Aktivität" };
export const dynamic = "force-dynamic";

const TYPES: Array<{ key: string; label: string }> = [
  { key: "", label: "Alle" },
  { key: "lead_created", label: "Neue Leads" },
  { key: "lead_repeat", label: "Wiederholte Anfragen" },
  { key: "booking_created", label: "Buchungen" },
  { key: "booking_canceled", label: "Absagen" },
  { key: "booking_rescheduled", label: "Verschiebungen" },
  { key: "status_changed", label: "Statuswechsel" },
  { key: "duplicate_blocked", label: "Dubletten" },
  { key: "integration_error", label: "Fehler" },
  { key: "webhook_rejected", label: "Abgewiesen" },
];

const TYPE_LABEL: Record<string, string> = Object.fromEntries(TYPES.filter((t) => t.key).map((t) => [t.key, t.label]));
const SOURCE_LABEL: Record<string, string> = {
  website: "Website",
  calendly: "Calendly",
  crm: "CRM",
  ga4: "GA4",
  google_ads: "Google Ads",
  gsc: "Search Console",
  meta_ads: "Meta Ads",
};

export default async function LivePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const type = one(sp.type) ?? "";
  if (!(await schemaReady())) {
    return (
      <>
        <PageHead title="Live-Aktivität" />
        <SchemaMissing />
      </>
    );
  }
  const [rows, src] = await Promise.all([listActivity({ limit: 200, type: type || undefined }), getSourceStatuses()]);

  return (
    <>
      <PageHead
        title="Live-Aktivität"
        subtitle="Neue Leads, Buchungen, Absagen, Statuswechsel sowie Integrations- und Tracking-Fehler. Nur echte Ereignisse."
        sources={[src.website, src.calendly]}
        actions={
          <Link href={`/marketing/live${type ? `?type=${type}` : ""}`} className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
            Aktualisieren
          </Link>
        }
      />
      <div className="mb-3 flex flex-wrap gap-1">
        {TYPES.map((t) => (
          <Link
            key={t.key || "all"}
            href={t.key ? `/marketing/live?type=${t.key}` : "/marketing/live"}
            className={cn("rounded-md px-2.5 py-1 text-xs font-medium", type === t.key ? "bg-neutral-900 text-white" : "bg-white text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-50")}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <Panel bodyClassName="p-0">
        {rows && rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-xs">
              <thead className="bg-neutral-50 text-neutral-500">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Zeit</th>
                  <th className="px-3 py-2 text-left font-medium">Typ</th>
                  <th className="px-3 py-2 text-left font-medium">Quelle</th>
                  <th className="px-3 py-2 text-left font-medium">Ereignis</th>
                  <th className="px-3 py-2 text-left font-medium">Kampagne</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} className="border-t border-neutral-100 align-top">
                    <td className="whitespace-nowrap px-3 py-2 text-neutral-600" title={formatDateTime(a.occurred_at)}>
                      {formatDateTime(a.occurred_at)}
                      <span className="block text-[11px] text-neutral-400">{formatAgo(a.occurred_at)}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
                          a.severity === "error" ? "border-rose-100 bg-rose-50 text-rose-700" : a.severity === "warning" ? "border-amber-100 bg-amber-50 text-amber-700" : "border-neutral-200 bg-neutral-50 text-neutral-600",
                        )}
                      >
                        {TYPE_LABEL[a.type] ?? a.type}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-neutral-600">{SOURCE_LABEL[a.source ?? ""] ?? a.source ?? "–"}</td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-neutral-800">
                        {a.lead_id ? (
                          <Link href={`/marketing/leads/${a.lead_id}`} className="hover:underline">
                            {a.title}
                          </Link>
                        ) : (
                          a.title
                        )}
                      </p>
                      {a.detail ? <p className="text-neutral-500">{a.detail}</p> : null}
                    </td>
                    <td className="px-3 py-2 text-neutral-600">{a.campaign ?? "–"}</td>
                    <td className="px-3 py-2 text-neutral-600">{a.status ?? "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-4 py-10 text-center text-sm text-neutral-500">Noch keine Ereignisse</p>
        )}
      </Panel>
    </>
  );
}
