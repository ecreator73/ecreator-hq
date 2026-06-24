import type { Metadata } from "next";
import { MailCheck, MessageSquareReply, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MessageCard } from "@/components/outreach/message-card";
import { GenerateDraft } from "@/components/outreach/generate-draft";
import { outreachMessagesService } from "@/server/services";
import type { OutreachMessageWithRelations } from "@/types/entities";

export const metadata: Metadata = { title: "Outreach - Inbox" };

const EMPTY_INBOX: {
  replied: OutreachMessageWithRelations[];
  positive: OutreachMessageWithRelations[];
  unanswered: OutreachMessageWithRelations[];
} = { replied: [], positive: [], unanswered: [] };

function MessageList({
  messages,
  emptyTitle,
  emptyDescription,
}: {
  messages: OutreachMessageWithRelations[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (messages.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {messages.map((m) => (
        <MessageCard key={m.id} message={m} />
      ))}
    </div>
  );
}

export default async function OutreachInboxPage() {
  const ib = await outreachMessagesService.inbox().catch(() => EMPTY_INBOX);

  return (
    <div className="space-y-6">
      {/* Aktionsleiste */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">
          Antworten nach Status gruppiert. Reagiere zuerst auf positive
          Rueckmeldungen und faellige Follow-ups.
        </p>
        <GenerateDraft />
      </div>

      {/* Positive Antworten */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MailCheck className="h-4 w-4 text-green-600" aria-hidden="true" />
            Positive Antworten ({ib.positive.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MessageList
            messages={ib.positive}
            emptyTitle="Noch keine positiven Antworten"
            emptyDescription="Sobald ein Lead Interesse signalisiert, erscheint die Nachricht hier - bereit fuer den naechsten Schritt."
          />
        </CardContent>
      </Card>

      {/* Neue Antworten */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareReply
              className="h-4 w-4 text-brand-600"
              aria-hidden="true"
            />
            Neue Antworten ({ib.replied.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MessageList
            messages={ib.replied}
            emptyTitle="Keine offenen Antworten"
            emptyDescription="Hier sammeln sich eingegangene Antworten, die noch qualifiziert werden muessen."
          />
        </CardContent>
      </Card>

      {/* Unbeantwortet / Follow-up faellig */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600" aria-hidden="true" />
            Unbeantwortet / Follow-up faellig ({ib.unanswered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MessageList
            messages={ib.unanswered}
            emptyTitle="Keine offenen Nachrichten"
            emptyDescription="Versendete und geoeffnete Nachrichten ohne Antwort erscheinen hier - der ideale Zeitpunkt fuer ein Follow-up."
          />
        </CardContent>
      </Card>
    </div>
  );
}
