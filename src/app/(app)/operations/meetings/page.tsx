import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { MeetingQuickCreate } from "@/components/knowledge/meeting-quick-create";
import { meetingAssistantService } from "@/server/services";
import type { MeetingWithRelations } from "@/types/entities";
import {
  MEETING_STATUSES,
  MEETING_TYPES,
  MEETING_TYPE_LABELS,
  statusLabel,
} from "@/config/catalog";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Operations - Meetings" };

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

function statusColor(status: string | null): string | undefined {
  return MEETING_STATUSES.find((s) => s.key === status)?.color;
}

function typeLabel(type: string | null): string {
  if (!type) return "-";
  return (
    MEETING_TYPE_LABELS[type as keyof typeof MEETING_TYPE_LABELS] ?? type
  );
}

function partnerLabel(m: MeetingWithRelations): string {
  return m.client?.name ?? m.lead?.company_name ?? "-";
}

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const filters = {
    meetingType: sp.type || undefined,
    search: sp.q || undefined,
  };

  const meetings = await meetingAssistantService.list(filters).catch(() => []);

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Meetings ({meetings.length})</CardTitle>
          <MeetingQuickCreate />
        </div>
        <form
          method="get"
          className="flex flex-wrap items-end gap-3"
        >
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
            Typ
            <select
              name="type"
              defaultValue={sp.type ?? ""}
              className={`${inputClass} min-w-[12rem]`}
            >
              <option value="">Alle Typen</option>
              {MEETING_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-neutral-500">
            Suche
            <input
              type="search"
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Titel suchen ..."
              className={`${inputClass} min-w-[14rem]`}
            />
          </label>
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50"
          >
            <Search className="h-4 w-4" />
            Filtern
          </button>
        </form>
      </CardHeader>
      <CardContent>
        {meetings.length === 0 ? (
          <EmptyState
            title="Keine Meetings gefunden"
            description="Es gibt keine Meetings, die zu den aktuellen Filtern passen. Lege ein neues Meeting an oder passe die Filter an."
            action={<MeetingQuickCreate />}
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full min-w-[56rem] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                  <th className="px-4 py-2.5 font-medium">Titel</th>
                  <th className="px-4 py-2.5 font-medium">Typ</th>
                  <th className="px-4 py-2.5 font-medium">Kunde / Lead</th>
                  <th className="px-4 py-2.5 font-medium">Datum</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Zusammenfassung</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {meetings.map((m) => (
                  <tr key={m.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/operations/meetings/${m.id}`}
                        className="font-medium text-neutral-900 hover:text-brand-700"
                      >
                        {m.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-neutral-700">
                      {typeLabel(m.meeting_type)}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-700">
                      {partnerLabel(m)}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600">
                      {m.meeting_date ? formatDate(m.meeting_date) : "-"}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge
                        label={statusLabel("meeting", m.status)}
                        color={statusColor(m.status)}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      {m.summary && m.summary.trim() ? (
                        <StatusBadge label="Vorhanden" color="green" />
                      ) : (
                        <span className="text-neutral-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
