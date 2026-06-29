import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth";
import { SALES_ROLES } from "@/config/navigation";
import { analyticsService } from "@/server/services";
import type { AnalyticsOverview } from "@/server/services";
import { metaService } from "@/server/integrations/meta/service";

export const metadata: Metadata = { title: "Analytics" };

function Kpi({ value, label, tone }: { value: string | number; label: string; tone?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className={`text-2xl font-semibold ${tone ?? "text-neutral-900"}`}>{value}</p>
        <p className="text-sm text-neutral-500">{label}</p>
      </CardContent>
    </Card>
  );
}

function Bars({ rows }: { rows: { label: string; total: number; won?: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-0.5 flex items-center justify-between text-sm">
            <span className="min-w-0 truncate text-neutral-700">{r.label}</span>
            <span className="shrink-0 font-medium tabular-nums text-neutral-900">{r.total}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${(r.total / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function AnalyticsPage() {
  await requireRole(SALES_ROLES);

  let data: AnalyticsOverview | null = null;
  try {
    data = await analyticsService.overview();
  } catch {
    data = null;
  }
  let meta: Awaited<ReturnType<typeof metaService.dashboardStats>> | null = null;
  let metaConn: Awaited<ReturnType<typeof metaService.connection>> | null = null;
  try {
    meta = await metaService.dashboardStats();
    metaConn = await metaService.connection();
  } catch {
    /* Meta noch nicht eingerichtet */
  }

  const metaTotal = data?.bySource.find((s) => s.key === "meta_ads")?.total ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Analytics"
        title="Analytics"
        description="Alle Zahlen an einem Ort: Sales-Performance je Mitarbeiter, Kampagnen, Quellen und Meta."
      />

      {!data ? (
        <EmptyState title="Keine Daten" description="Sobald Leads vorhanden sind, erscheinen hier die Auswertungen." />
      ) : (
        <>
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi value={data.totalLeads} label="Leads gesamt" />
            <Kpi value={data.won} label="Abschlüsse" tone="text-emerald-600" />
            <Kpi value={`${data.conversion}%`} label="Conversion" tone="text-brand-700" />
            <Kpi value={data.open} label="Offen" />
          </div>

          {/* Sales-Performance je Mitarbeiter */}
          <Card>
            <CardHeader><CardTitle>Sales-Performance je Mitarbeiter</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-neutral-200">
                <table className="w-full min-w-[36rem] text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                      <th className="px-4 py-2.5 font-medium">Mitarbeiter</th>
                      <th className="px-4 py-2.5 text-right font-medium">Leads</th>
                      <th className="px-4 py-2.5 text-right font-medium">Abschlüsse</th>
                      <th className="px-4 py-2.5 text-right font-medium">Offen</th>
                      <th className="px-4 py-2.5 text-right font-medium">Conversion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {data.byOwner.map((o) => (
                      <tr key={o.ownerId ?? "none"} className="hover:bg-neutral-50">
                        <td className="px-4 py-2.5 font-medium text-neutral-900">{o.name}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">{o.total}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-emerald-600">{o.won}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-neutral-600">{o.open}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-medium text-neutral-900">{o.conversion}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Quellen */}
            <Card>
              <CardHeader><CardTitle>Leads nach Quelle</CardTitle></CardHeader>
              <CardContent><Bars rows={data.bySource} /></CardContent>
            </Card>

            {/* Status-Verteilung */}
            <Card>
              <CardHeader><CardTitle>Pipeline-Verteilung</CardTitle></CardHeader>
              <CardContent><Bars rows={data.byStatus} /></CardContent>
            </Card>
          </div>

          {/* Top Kampagnen */}
          <Card>
            <CardHeader><CardTitle>Top Kampagnen</CardTitle></CardHeader>
            <CardContent>
              {data.byCampaign.length === 0 ? (
                <p className="text-sm text-neutral-400">Keine Kampagnendaten vorhanden.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-neutral-200">
                  <table className="w-full min-w-[32rem] text-sm">
                    <thead>
                      <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                        <th className="px-4 py-2.5 font-medium">Kampagne</th>
                        <th className="px-4 py-2.5 text-right font-medium">Leads</th>
                        <th className="px-4 py-2.5 text-right font-medium">Abschlüsse</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {data.byCampaign.map((c) => (
                        <tr key={c.key} className="hover:bg-neutral-50">
                          <td className="px-4 py-2.5 text-neutral-800">{c.label}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">{c.total}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-emerald-600">{c.won}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Meta */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Meta (Facebook Lead Ads)</CardTitle>
          {metaConn?.status === "connected" ? <Badge tone="green">Verbunden</Badge> : <Badge tone="neutral">Nicht verbunden</Badge>}
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi value={metaTotal} label="Meta-Leads gesamt" />
            <Kpi value={meta?.today ?? 0} label="Heute" />
            <Kpi value={meta?.week ?? 0} label="Letzte 7 Tage" />
            <Kpi value={metaConn?.config.pages?.length ?? 0} label="Verbundene Seiten" />
          </div>
          {meta && meta.topCampaigns.length > 0 ? (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Top Meta-Kampagnen</p>
              <Bars rows={meta.topCampaigns.map((c) => ({ label: c.name, total: c.count }))} />
            </div>
          ) : null}
          <Link href="/settings/integrations/meta" className="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline">
            Meta-Einstellungen öffnen →
          </Link>
        </CardContent>
      </Card>

      {/* Weitere Quellen (geplant) */}
      <Card>
        <CardHeader><CardTitle>Weitere Datenquellen</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {["Google Ads", "TikTok Ads", "LinkedIn Ads", "SEO / Google Search Console", "Website-Analytics (GA4)"].map((s) => (
              <li key={s} className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-2.5 text-sm text-neutral-700">
                <span>{s}</span>
                <Badge tone="amber">Geplant</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
