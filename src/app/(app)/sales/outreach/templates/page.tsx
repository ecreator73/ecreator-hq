import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { TemplateQuickCreate } from "@/components/outreach/template-quick-create";
import { CampaignQuickCreate } from "@/components/outreach/campaign-quick-create";
import { SequenceQuickCreate } from "@/components/outreach/sequence-quick-create";
import {
  emailTemplatesService,
  outreachCampaignsService,
  followUpSequencesService,
} from "@/server/services";
import type {
  EmailTemplate,
  OutreachCampaign,
  FollowUpSequence,
} from "@/types/entities";
import {
  EMAIL_TEMPLATE_CATEGORY_LABELS,
  CAMPAIGN_TYPE_LABELS,
  CAMPAIGN_STATUS_LABELS,
  campaignStatusColor,
} from "@/config/catalog";

export const metadata: Metadata = { title: "Outreach - Templates & Kampagnen" };

function categoryLabel(key: string | null): string {
  if (!key) return "Allgemein";
  return (
    EMAIL_TEMPLATE_CATEGORY_LABELS[
      key as keyof typeof EMAIL_TEMPLATE_CATEGORY_LABELS
    ] ?? key
  );
}

function campaignTypeLabel(key: string | null): string {
  if (!key) return "-";
  return (
    CAMPAIGN_TYPE_LABELS[key as keyof typeof CAMPAIGN_TYPE_LABELS] ?? key
  );
}

function campaignStatusLabel(key: string): string {
  return (
    CAMPAIGN_STATUS_LABELS[key as keyof typeof CAMPAIGN_STATUS_LABELS] ?? key
  );
}

export default async function OutreachTemplatesPage() {
  const templates: EmailTemplate[] = await emailTemplatesService
    .list()
    .catch(() => []);
  const campaigns: OutreachCampaign[] = await outreachCampaignsService
    .list()
    .catch(() => []);
  const sequences: FollowUpSequence[] = await followUpSequencesService
    .list()
    .catch(() => []);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* E-Mail-Templates */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex-row items-center justify-between gap-4">
          <CardTitle>E-Mail-Templates ({templates.length})</CardTitle>
          <TemplateQuickCreate />
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <EmptyState
              title="Noch keine Templates"
              description="Lege wiederverwendbare E-Mail-Vorlagen mit Platzhaltern wie {{vorname}} oder {{firma}} an. Variablen werden beim Speichern automatisch erkannt."
            />
          ) : (
            <ul className="divide-y divide-neutral-100">
              {templates.map((t) => (
                <li key={t.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-neutral-900">
                      {t.name}
                    </span>
                    <Badge tone="neutral">{categoryLabel(t.category)}</Badge>
                    {t.active ? (
                      <Badge tone="green">Aktiv</Badge>
                    ) : (
                      <Badge tone="neutral">Inaktiv</Badge>
                    )}
                  </div>
                  {t.subject ? (
                    <p className="mt-1.5 truncate text-sm text-neutral-600">
                      <span className="text-neutral-400">Betreff:</span>{" "}
                      {t.subject}
                    </p>
                  ) : null}
                  {t.variables.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {t.variables.map((v) => (
                        <Badge key={v} tone="brand">
                          {`{{${v}}}`}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Kampagnen */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4">
          <CardTitle>Kampagnen ({campaigns.length})</CardTitle>
          <CampaignQuickCreate />
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <EmptyState
              title="Noch keine Kampagnen"
              description="Buendle deine Outreach-Aktivitaeten in Kampagnen nach Dienstleistung - z.B. Website Audit oder Meta Ads."
            />
          ) : (
            <ul className="divide-y divide-neutral-100">
              {campaigns.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-neutral-900">
                      {c.name}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {campaignTypeLabel(c.campaign_type)}
                    </p>
                  </div>
                  <StatusBadge
                    label={campaignStatusLabel(c.status)}
                    color={campaignStatusColor(c.status)}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Follow-up-Sequenzen */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4">
          <CardTitle>Follow-up-Sequenzen ({sequences.length})</CardTitle>
          <SequenceQuickCreate />
        </CardHeader>
        <CardContent>
          {sequences.length === 0 ? (
            <EmptyState
              title="Noch keine Sequenzen"
              description="Lege eine mehrstufige Follow-up-Sequenz an. Tipp: Mit 'Standard-Sequenz' erstellst du in einem Klick Erstkontakt + drei Follow-ups (Tag 0/3/7/14)."
            />
          ) : (
            <ul className="divide-y divide-neutral-100">
              {sequences.map((s) => (
                <li key={s.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-neutral-900">
                      {s.name}
                    </span>
                    {s.active ? (
                      <Badge tone="green">Aktiv</Badge>
                    ) : (
                      <Badge tone="neutral">Inaktiv</Badge>
                    )}
                  </div>
                  {s.description ? (
                    <p className="mt-1 text-sm text-neutral-600">
                      {s.description}
                    </p>
                  ) : null}
                  {s.steps.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {s.steps.map((step, i) => (
                        <span
                          key={`${s.id}-${i}`}
                          className="inline-flex items-center rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs text-neutral-600"
                        >
                          Tag {step.day}: {step.label}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
