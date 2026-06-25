import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { ClientWarnings } from "@/components/clients/client-warnings";
import { clientsOpsService } from "@/server/services";
import type { ClientWithStats } from "@/types/entities";
import { statusLabel, STATUS_REGISTRY } from "@/config/catalog";
import { formatCHF, cn } from "@/lib/utils";

function clientStatusColor(status: string | null): string | undefined {
  if (!status) return undefined;
  return STATUS_REGISTRY.client[status as keyof typeof STATUS_REGISTRY.client]
    ?.color;
}

export const metadata: Metadata = { title: "Clients - Dashboard" };

interface ClientDashboard {
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
}

const EMPTY_DASHBOARD: ClientDashboard = {
  active: 0,
  onboarding: 0,
  paused: 0,
  ended: 0,
  totalMrr: 0,
  contractsExpiring: 0,
  withOpenTasks: 0,
  noContact: 0,
  reportingThisWeek: 0,
  reportingThisMonth: 0,
};

type WidgetTone = "neutral" | "brand" | "amber" | "green" | "red";

const TONE_STYLES: Record<WidgetTone, string> = {
  neutral: "text-neutral-900",
  brand: "text-brand-700",
  amber: "text-amber-600",
  green: "text-green-600",
  red: "text-red-600",
};

function Widget({
  label,
  value,
  href,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  href?: string;
  tone?: WidgetTone;
}) {
  const inner = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tabular-nums",
          TONE_STYLES[tone],
        )}
      >
        {value}
      </p>
    </>
  );
  const base =
    "block rounded-xl border border-neutral-200 bg-white p-5 shadow-sm";
  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          base,
          "transition-colors hover:border-brand-300 hover:bg-brand-50/40",
        )}
      >
        {inner}
      </Link>
    );
  }
  return <div className={base}>{inner}</div>;
}

export default async function ClientsDashboardPage() {
  const d = await clientsOpsService.dashboard().catch(() => EMPTY_DASHBOARD);

  let all: ClientWithStats[] = [];
  try {
    all = await clientsOpsService.listWithStats({});
  } catch {
    all = [];
  }

  const flagged = all.filter((c) => c.warnings.length > 0);

  return (
    <div className="space-y-6">
      {/* KPI-Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <Widget
          label="Aktive Kunden"
          value={d.active}
          href="/clients/list?status=active"
          tone="green"
        />
        <Widget
          label="Onboarding"
          value={d.onboarding}
          href="/clients/list?status=onboarding"
          tone="brand"
        />
        <Widget
          label="Pausiert"
          value={d.paused}
          href="/clients/list?status=paused"
          tone={d.paused > 0 ? "amber" : "neutral"}
        />
        <Widget label="MRR" value={formatCHF(d.totalMrr)} tone="brand" />
        <Widget
          label="Reporting-Calls diese Woche"
          value={d.reportingThisWeek}
          href="/clients/reporting"
          tone={d.reportingThisWeek > 0 ? "amber" : "neutral"}
        />
        <Widget
          label="Verträge laufen aus"
          value={d.contractsExpiring}
          href="/clients/list"
          tone={d.contractsExpiring > 0 ? "red" : "neutral"}
        />
        <Widget
          label="Kunden mit offenen Aufgaben"
          value={d.withOpenTasks}
          href="/clients/list"
        />
        <Widget
          label="Kunden ohne Kontakt > 30 Tage"
          value={d.noContact}
          href="/clients/list"
          tone={d.noContact > 0 ? "amber" : "neutral"}
        />
      </div>

      {/* Kunden mit Warnungen */}
      <Card>
        <CardHeader>
          <CardTitle>Kunden mit Warnungen ({flagged.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {flagged.length === 0 ? (
            <EmptyState
              title="Alles im gruenen Bereich"
              description="Kein Kunde hat aktuell offene Warnungen - letzter Kontakt, Reporting-Calls und Aufgaben sind im Griff."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-neutral-200">
              <table className="w-full min-w-[40rem] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                    <th className="px-4 py-2.5 font-medium">Firma</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Warnungen</th>
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
    </div>
  );
}
