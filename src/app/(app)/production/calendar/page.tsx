import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ProductionCalendar } from "@/components/production/production-calendar";
import { productionDashboardService } from "@/server/services";
import type { ProductionCalendarEvent } from "@/types/entities";
import { today, isoDay, addDays } from "@/lib/dates";

export const metadata: Metadata = { title: "Production - Kalender" };

export default async function ProductionCalendarPage() {
  const from = today();
  const to = isoDay(addDays(new Date(), 30));

  const events: ProductionCalendarEvent[] = await productionDashboardService
    .calendar(from, to)
    .catch(() => []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Production"
        title="Produktions-Kalender"
        description="Shootings, Launches, CRM Go-Lives, Deadlines und Reporting-Calls der naechsten 30 Tage."
      />
      <ProductionCalendar events={events} />
    </div>
  );
}
