import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { Badge } from "@/components/ui/badge";
import { ClientWarnings } from "@/components/clients/client-warnings";
import { clientsOpsService, reportingCallsService } from "@/server/services";
import type {
  ClientWithStats,
  ReportingCallWithRelations,
} from "@/types/entities";
import { statusLabel, STATUS_REGISTRY } from "@/config/catalog";
import { formatCHF, formatDate, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Clients - Dashboard" };

function clientStatusColor(status: string | null): string | undefined {
  if (!status) return undefined;
  return STATUS_REGISTRY.client[status as keyof typeof STATUS_REGISTRY.client]
    ?.color;
}

function reportingStatusColor(status: string | null): string | undefined {
  if (!status) return undefined;
  return STATUS_REGISTRY.reporting_call[
    status as keyof typeof STATUS_REGISTRY.reporting_call
  ]?.color;
}

function dayISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

type Tone = "neutral" | "brand" | "amber" | "green" | "red";

const TONE_STYLES: Record<Tone, string> = {
  neutral: "text-neutral-900",
  brand: "text-brand-700",
  amber: "text-amber-600",
  green: "text-green-600",
  red: "text-red-600",
};

/** Eine Kennzahl - immer anklickbar, fuehrt dorthin wo man handelt. */
function Kpi({
  label,
  value,
  hint,
  href,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint: string;
  href: string;
  tone?: Tone;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50/40"
    >
      <p className="text-sm font-medium text-neutral-500">{label}</p>
      <p
        className={cn(
          "mt-2 text-3xl font-semibold tabular-nums",
          TONE_STYLES[tone],
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-neutral-500">{hint}</p>
    </Link>
  );
}

export default async function ClientsDashboardPage() {
  // Unabhaengige Abrufe parallel.
  const [clients, calls] = await Promise.all([
    clientsOpsService.listWithStats({}).catch(() => [] as ClientWithStats[]),
    reportingCallsService
      .list({ statusIn: ["open", "scheduled"] })
      .catch(() => [] as ReportingCallWithRelations[]),
  ]);

  const today = dayISO();
  const inSevenDays = dayISO(7);

  const activeClients = clients.filter((c) => c.status === "active");
  const totalMrr = activeClients.reduce((sum, c) => sum + c.mrr, 0);
  const flagged = clients.filter((c) => c.warnings.length > 0);

  const scheduled = calls
    .filter((c) => Boolean(c.scheduled_date))
    .map((c) => ({
      id: c.id,
      clientId: c.client_id,
      clientName: c.client?.name ?? "Ohne Kunde",
      owner: c.owner?.full_name ?? null,
      date: (c.scheduled_date as string).slice(0, 10),
      status: c.status as string,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const dueSoon = scheduled.filter((c) => c.date <= inSevenDays);
  const nextCalls = scheduled.slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Die vier wichtigsten Zahlen */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Aktive Kunden"
          value={activeClients.length}
          hint="Kundenliste oeffnen"
          href="/clients/list?status=active"
          tone="green"
        />
        <Kpi
          label="Monatlicher Umsatz"
          value={formatCHF(totalMrr)}
          hint="Summe aus aktiven Vertraegen"
          href="/clients/list?status=active"
          tone="brand"
        />
        <Kpi
          label="Kunden mit Warnungen"
          value={flagged.length}
          hint="Brauchen Aufmerksamkeit"
          href="#warnungen"
          tone={flagged.length > 0 ? "amber" : "neutral"}
        />
        <Kpi
          label="Reporting-Calls faellig"
          value={dueSoon.length}
          hint="Heute bis in 7 Tagen"
          href="/clients/reporting"
          tone={dueSoon.length > 0 ? "amber" : "neutral"}
        />
      </div>

      {/* Handlungsbereiche nebeneinander - nutzt die volle Breite */}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card id="warnungen" className="xl:col-span-2 scroll-mt-24">
          <CardHeader>
            <CardTitle>Kunden, die Aufmerksamkeit brauchen</CardTitle>
          </CardHeader>
          <CardContent>
            {flagged.length === 0 ? (
              <EmptyState
                icon={ShieldCheck}
                title="Alles im gruenen Bereich"
                description="Kein Kunde hat offene Warnungen. Kontakt, Reporting-Calls und Aufgaben sind im Griff."
                action={
                  <Link
                    href="/clients/list"
                    className="inline-flex h-9 items-center rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50"
                  >
                    Alle Kunden ansehen
                  </Link>
                }
              />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-neutral-200">
                <table className="w-full min-w-[40rem] text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                      <th className="px-4 py-2.5 font-medium">Firma</th>
                      <th className="px-4 py-2.5 font-medium">Status</th>
                      <th className="px-4 py-2.5 font-medium">Was fehlt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {flagged.map((c) => (
                      <tr key={c.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-2.5">
                          <Link
                            href={`/clients/${c.id}`}
                            className="font-medium text-neutral-900 hover:text-brand-700"
                          >
                            {c.name}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusBadge
                            label={statusLabel("client", c.status)}
                            color={clientStatusColor(c.status)}
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <ClientWarnings warnings={c.warnings} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Naechste Reporting-Calls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {nextCalls.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="Kein Reporting-Call geplant"
                description="Plane den naechsten Termin, damit Kunden regelmaessig Ergebnisse sehen."
                action={
                  <Link
                    href="/clients/reporting"
                    className="inline-flex h-9 items-center rounded-lg bg-brand-600 px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
                  >
                    Reporting-Call planen
                  </Link>
                }
              />
            ) : (
              <>
                {nextCalls.map((c) => (
                  <Link
                    key={c.id}
                    href={`/clients/${c.clientId}`}
                    className="flex items-start justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2.5 transition-colors hover:border-brand-300 hover:bg-brand-50/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-900">
                        {c.clientName}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {formatDate(c.date)}
                        {c.owner ? ` - ${c.owner}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {c.date < today ? (
                        <Badge tone="red">Ueberfaellig</Badge>
                      ) : (
                        <StatusBadge
                          label={statusLabel("reporting_call", c.status)}
                          color={reportingStatusColor(c.status)}
                        />
                      )}
                    </div>
                  </Link>
                ))}
                <Link
                  href="/clients/reporting"
                  className="block pt-1 text-sm font-medium text-brand-700 hover:text-brand-800"
                >
                  Alle Reporting-Calls ansehen
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
