import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { clientsService } from "@/server/services";
import { productionCrmService } from "@/server/services/production-crm.service";
import { ContentCalendar } from "@/components/production/content-calendar";

export const metadata: Metadata = { title: "Content - Redaktionsplan" };

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ monat?: string }> }) {
  await requireUser();
  const { monat } = await searchParams;
  const now = new Date();
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const month = monat && /^\d{4}-\d{2}$/.test(monat) ? monat : current;
  const [y, m] = month.split("-").map(Number) as [number, number];
  // Monatsgrenzen mit Puffer (Zeitzone), die Ansicht filtert exakt nach Zuercher Datum
  const from = new Date(Date.UTC(y, m - 1, 1) - 86_400_000).toISOString();
  const to = new Date(Date.UTC(y, m, 1) + 86_400_000).toISOString();
  const [data, clients] = await Promise.all([
    productionCrmService.contentMonth(from, to, y, m).catch(() => ({ items: [], backlog: [], plans: [] })),
    clientsService.list().catch(() => []),
  ]);
  return (
    <ContentCalendar
      month={month}
      items={data.items}
      backlog={data.backlog}
      plans={data.plans}
      clients={clients.filter((c) => c.status !== "ended").map((c) => ({ id: c.id, name: c.name }))}
    />
  );
}
