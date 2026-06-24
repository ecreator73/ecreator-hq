import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusSelect } from "@/components/production/status-select";
import { MeetingQuickCreate } from "@/components/outreach/meeting-quick-create";
import { bookedMeetingsService } from "@/server/services";
import { setMeetingStatusAction } from "@/app/(app)/sales/outreach/actions";
import type { BookedMeetingWithRelations } from "@/types/entities";
import {
  BOOKED_MEETING_STATUSES,
  MEETING_SOURCE_LABELS,
} from "@/config/catalog";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Outreach - Termine" };

export default async function MeetingsPage() {
  const meetings: BookedMeetingWithRelations[] = await bookedMeetingsService
    .list()
    .catch(() => []);

  return (
    <div className="space-y-6">
      {/* Aktionsleiste */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">
          {meetings.length}{" "}
          {meetings.length === 1 ? "gebuchter Termin" : "gebuchte Termine"}
        </p>
        <MeetingQuickCreate />
      </div>

      <Card>
        <CardContent className="p-0">
          {meetings.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Noch keine Termine"
                description="Hier erscheinen gebuchte Termine aus dem Outreach. Lege den ersten manuell an."
                action={<MeetingQuickCreate />}
              />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-neutral-200">
              <table className="w-full min-w-[48rem] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                    <th className="px-4 py-2.5 font-medium">Titel</th>
                    <th className="px-4 py-2.5 font-medium">Kunde</th>
                    <th className="px-4 py-2.5 font-medium">Datum</th>
                    <th className="px-4 py-2.5 font-medium">Quelle</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {meetings.map((m) => (
                    <tr key={m.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-2.5">
                        <span className="font-medium text-neutral-900">
                          {m.title || m.lead?.company_name || "Termin"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-neutral-700">
                        {m.lead ? (
                          <Link
                            href={`/sales/leads/${m.lead.id}`}
                            className="hover:text-brand-700"
                          >
                            {m.lead.company_name}
                          </Link>
                        ) : (
                          <span className="text-neutral-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-neutral-700">
                        {m.date ? formatDate(m.date) : "-"}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-700">
                        {m.source
                          ? (MEETING_SOURCE_LABELS[
                              m.source as keyof typeof MEETING_SOURCE_LABELS
                            ] ?? m.source)
                          : "-"}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusSelect
                          id={m.id}
                          value={m.status}
                          statuses={BOOKED_MEETING_STATUSES}
                          action={setMeetingStatusAction}
                        />
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
