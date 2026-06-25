import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { clientInteractionsService } from "@/server/services";
import type { ClientInteractionWithClient } from "@/server/services/client-interactions.service";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Clients - Aktivitaeten" };

const TYPE_LABEL: Record<string, string> = {
  call: "Anruf",
  email: "E-Mail",
  meeting: "Meeting",
  note: "Notiz",
  message: "Nachricht",
};

export default async function ClientActivitiesPage() {
  let items: ClientInteractionWithClient[] = [];
  try {
    items = await clientInteractionsService.recent(80);
  } catch {
    items = [];
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Clients"
        title="Aktivitaeten"
        description="Letzte Interaktionen ueber alle Kunden: Anrufe, E-Mails, Meetings und Notizen."
      />
      {items.length === 0 ? (
        <EmptyState
          title="Noch keine Aktivitaeten"
          description="Sobald Interaktionen bei Kunden erfasst werden, erscheinen sie hier."
        />
      ) : (
        <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
          {items.map((it) => (
            <li key={it.id} className="flex items-start gap-3 px-4 py-3">
              <Badge tone="neutral">{TYPE_LABEL[String(it.type)] ?? String(it.type)}</Badge>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-neutral-900">
                  {it.subject || "—"}
                </p>
                {it.body ? (
                  <p className="mt-0.5 line-clamp-2 text-sm text-neutral-500">{it.body}</p>
                ) : null}
                <p className="mt-1 text-xs text-neutral-400">
                  {it.client ? (
                    <Link href={`/clients/${it.client.id}`} className="font-medium text-neutral-500 hover:text-brand-700">
                      {it.client.name}
                    </Link>
                  ) : null}
                  {it.author?.full_name ? ` · ${it.author.full_name}` : ""}
                </p>
              </div>
              <span className="shrink-0 text-xs text-neutral-400">
                {formatDate(it.interaction_date)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
