import type { Metadata } from "next";
import { GenerateDraft } from "@/components/outreach/generate-draft";
import { OutreachPipeline } from "@/components/outreach/outreach-pipeline";
import { outreachMessagesService } from "@/server/services";
import type { OutreachMessageWithRelations } from "@/types/entities";

export const metadata: Metadata = { title: "Outreach - Pipeline" };

export default async function OutreachPipelinePage() {
  const messages: OutreachMessageWithRelations[] =
    await outreachMessagesService.list({}).catch(() => []);

  return (
    <div className="space-y-6">
      {/* Aktionsleiste */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">
          Per Drag &amp; Drop durch die Phasen ziehen.
        </p>
        <GenerateDraft />
      </div>

      <OutreachPipeline messages={messages} />
    </div>
  );
}
