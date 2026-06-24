import type { Metadata } from "next";
import { salesMeetingsService } from "@/server/services";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { MeetingQuickCreate } from "@/components/sales/meeting-quick-create";
import { STATUS_REGISTRY, statusLabel } from "@/config/catalog";
import { formatDate } from "@/lib/utils";
import type { SalesMeetingRow } from "@/types/entities";

export const metadata: Metadata = { title: "Sales - Termine" };

function meetingStatusColor(status: string | null) {
  if (!status) return undefined;
  return STATUS_REGISTRY.meeting[status as keyof typeof STATUS_REGISTRY.meeting]
    ?.color;
}

export default async function MeetingsPage() {
  let list: SalesMeetingRow[] = [];
  try {
    list = await salesMeetingsService.list();
  } catch {
    list = [];
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sales"
        title="Termine"
        description="Alle geplanten und durchgefuehrten Verkaufstermine."
        actions={<MeetingQuickCreate />}
      />

      {list.length === 0 ? (
        <EmptyState
          title="Keine Termine vorhanden"
          description="Lege einen neuen Termin an, um Gespraeche zu planen."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="w-full min-w-[56rem] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                <th className="px-4 py-2.5 font-medium">Titel</th>
                <th className="px-4 py-2.5 font-medium">Lead / Kunde</th>
                <th className="px-4 py-2.5 font-medium">Datum</th>
                <th className="px-4 py-2.5 font-medium">Dauer</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {list.map((m) => (
                <tr key={m.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-2.5 font-medium text-neutral-900">
                    {m.title}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-500">
                    {m.lead?.company_name || m.client?.name || "-"}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-600">
                    {m.meeting_date ? formatDate(m.meeting_date) : "-"}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-600">
                    {m.duration_minutes != null
                      ? `${m.duration_minutes} min`
                      : "-"}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge
                      label={statusLabel("meeting", m.status)}
                      color={meetingStatusColor(m.status)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
