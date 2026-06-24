import { getContext, ServiceError } from "./_helpers";
import { recordAudit } from "@/lib/activity";
import { renderTemplate } from "@/lib/ai-prompt";
import { leadsService } from "./leads.service";
import { emailTemplatesService, unsubscribesService } from "./outreach.service";
import { aiRunsService } from "./ai.service";
import {
  outreachMessageInsertSchema,
  outreachMessageUpdateSchema,
  type OutreachMessageCreateInput,
  type OutreachMessageUpdateInput,
} from "@/lib/validation/outreach";
import type {
  OutreachMessageWithRelations,
  OutreachDashboard,
} from "@/types/entities";

const SELECT = `
  *,
  lead:leads!outreach_messages_lead_id_fkey(id,company_name),
  campaign:outreach_campaigns!outreach_messages_campaign_id_fkey(id,name)
`;

export interface MessageFilters {
  campaignId?: string;
  status?: string;
  statusIn?: string[];
  leadId?: string;
}

function mapRow(row: Record<string, unknown>): OutreachMessageWithRelations {
  const { lead, campaign, ...rest } = row as Record<string, unknown> & {
    lead?: unknown;
    campaign?: unknown;
  };
  return {
    ...(rest as object),
    lead: (lead as OutreachMessageWithRelations["lead"]) ?? null,
    campaign: (campaign as OutreachMessageWithRelations["campaign"]) ?? null,
  } as OutreachMessageWithRelations;
}

const SENT_STATES = ["sent", "opened", "replied", "positive", "negative", "no_interest"];
const REPLY_STATES = ["replied", "positive", "negative"];

export const outreachMessagesService = {
  async list(filters: MessageFilters = {}): Promise<OutreachMessageWithRelations[]> {
    const { supabase } = await getContext();
    let q = supabase
      .from("outreach_messages")
      .select(SELECT)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (filters.campaignId) q = q.eq("campaign_id", filters.campaignId);
    if (filters.status) q = q.eq("status", filters.status);
    if (filters.statusIn?.length) q = q.in("status", filters.statusIn);
    if (filters.leadId) q = q.eq("lead_id", filters.leadId);
    const { data, error } = await q.limit(1000);
    if (error) throw new ServiceError("Nachrichten konnten nicht geladen werden", error);
    return ((data ?? []) as unknown as Array<Record<string, unknown>>).map(mapRow);
  },

  async getById(id: string): Promise<OutreachMessageWithRelations | null> {
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("outreach_messages").select(SELECT).eq("id", id).is("deleted_at", null).maybeSingle();
    if (error) throw new ServiceError("Nachricht konnte nicht geladen werden", error);
    return data ? mapRow(data as Record<string, unknown>) : null;
  },

  async create(input: OutreachMessageCreateInput): Promise<OutreachMessageWithRelations> {
    const parsed = outreachMessageInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("outreach_messages").insert(parsed).select(SELECT).single();
    if (error) throw new ServiceError("Nachricht konnte nicht erstellt werden", error);
    const row = mapRow(data as Record<string, unknown>);
    await recordAudit({ action: "create", entityType: "outreach_message", entityId: row.id, newValues: row });
    return row;
  },

  async update(id: string, input: OutreachMessageUpdateInput): Promise<OutreachMessageWithRelations> {
    const parsed = outreachMessageUpdateSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("outreach_messages").update(parsed).eq("id", id).is("deleted_at", null).select(SELECT).single();
    if (error) throw new ServiceError("Nachricht konnte nicht aktualisiert werden", error);
    return mapRow(data as Record<string, unknown>);
  },

  /** Status setzen; passende Zeitstempel mitfuehren. */
  async setStatus(id: string, status: string): Promise<OutreachMessageWithRelations> {
    const patch: Record<string, unknown> = { status };
    const now = new Date().toISOString();
    if (status === "opened") patch.opened_at = now;
    if (["replied", "positive", "negative", "no_interest"].includes(status)) patch.replied_at = now;
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("outreach_messages").update(patch).eq("id", id).is("deleted_at", null).select(SELECT).single();
    if (error) throw new ServiceError("Status konnte nicht gesetzt werden", error);
    return mapRow(data as Record<string, unknown>);
  },

  /**
   * Personalisierten ENTWURF erstellen (AI-Layer-Vorbereitung). Nutzt ein
   * E-Mail-Template (gerendert mit Lead-Daten) oder einen Basis-Entwurf. KEIN
   * Versand. Respektiert Opt-out. Protokolliert einen ai_run.
   */
  async generateDraft(opts: {
    leadId: string;
    templateId?: string | null;
    campaignId?: string | null;
  }): Promise<OutreachMessageWithRelations> {
    const lead = await leadsService.getById(opts.leadId);
    if (!lead) throw new ServiceError("Lead nicht gefunden");
    if (await unsubscribesService.isUnsubscribed(lead.email)) {
      throw new ServiceError("Kontakt hat sich abgemeldet - nicht kontaktieren.");
    }
    const values: Record<string, unknown> = {
      company_name: lead.company_name,
      contact_name: lead.contact_name ?? "",
      website: lead.website ?? "",
      city: lead.city ?? "",
      industry: lead.industry ?? "",
    };

    let subject: string;
    let body: string;
    if (opts.templateId) {
      const tpl = await emailTemplatesService.getById(opts.templateId);
      if (!tpl) throw new ServiceError("Template nicht gefunden");
      subject = renderTemplate(tpl.subject, values).text;
      body = renderTemplate(tpl.body, values).text;
    } else {
      const anrede = lead.contact_name || lead.company_name;
      subject = `Kurze Idee fuer ${lead.company_name}`;
      body =
        `Hallo ${anrede},\n\n` +
        `mir ist ${lead.company_name}${lead.city ? ` in ${lead.city}` : ""} aufgefallen. ` +
        `Ich sehe konkretes Potenzial, mehr Anfragen zu gewinnen.\n\n` +
        `Haetten Sie diese Woche 15 Minuten fuer einen kurzen Austausch?\n\n` +
        `Beste Gruesse`;
    }

    const msg = await this.create({
      lead_id: opts.leadId,
      template_id: opts.templateId ?? undefined,
      campaign_id: opts.campaignId ?? undefined,
      subject,
      body,
      status: "draft",
    });

    await aiRunsService.log({
      entity_type: "outreach_message",
      entity_id: msg.id,
      status: "success",
      input_data: values,
      output_data: { note: "Vorschau - kein Live-AI/Versand in dieser Phase.", subject, body },
      token_usage: 0,
      cost_estimate: 0,
    });
    return msg;
  },

  /**
   * "Senden": markiert die Nachricht als gesendet. Tatsaechliche Zustellung
   * erfordert eine verbundene Gmail-/Resend-Integration (Phase 9 vorbereitet).
   */
  async send(id: string): Promise<OutreachMessageWithRelations> {
    const msg = await this.getById(id);
    if (!msg) throw new ServiceError("Nachricht nicht gefunden");
    if (!msg.subject || !msg.body) throw new ServiceError("Betreff und Text sind erforderlich.");
    if (msg.lead_id) {
      const lead = await leadsService.getById(msg.lead_id);
      if (lead && (await unsubscribesService.isUnsubscribed(lead.email))) {
        throw new ServiceError("Kontakt hat sich abgemeldet - Versand blockiert.");
      }
    }
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("outreach_messages")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", id)
      .is("deleted_at", null)
      .select(SELECT)
      .single();
    if (error) throw new ServiceError("Nachricht konnte nicht gesendet werden", error);
    const row = mapRow(data as Record<string, unknown>);
    await recordAudit({ action: "send", entityType: "outreach_message", entityId: id });
    return row;
  },

  async remove(id: string): Promise<void> {
    const { supabase, userId } = await getContext();
    const { error } = await supabase
      .from("outreach_messages")
      .update({ deleted_at: new Date().toISOString(), updated_by: userId })
      .eq("id", id)
      .is("deleted_at", null);
    if (error) throw new ServiceError("Nachricht konnte nicht geloescht werden", error);
  },

  async dashboard(): Promise<OutreachDashboard> {
    const { supabase } = await getContext();
    const [msgRes, meetRes] = await Promise.all([
      supabase.from("outreach_messages").select("status").is("deleted_at", null),
      supabase.from("booked_meetings").select("id", { count: "exact", head: true }),
    ]);
    const rows = (msgRes.data ?? []) as Array<{ status: string }>;
    const sent = rows.filter((r) => SENT_STATES.includes(r.status)).length;
    const replies = rows.filter((r) => REPLY_STATES.includes(r.status)).length;
    const positive = rows.filter((r) => r.status === "positive").length;
    const meetings = meetRes.count ?? 0;
    const pct = (n: number) => (sent > 0 ? Math.round((n / sent) * 100) : 0);
    return {
      drafts: rows.filter((r) => r.status === "draft").length,
      sent,
      replies,
      positive,
      followupsDue: rows.filter((r) => r.status === "sent").length,
      meetings,
      replyRate: pct(replies),
      positiveRate: pct(positive),
      meetingRate: pct(meetings),
    };
  },

  /** Sales Inbox: nach Antwortstatus gruppiert. */
  async inbox(): Promise<{
    replied: OutreachMessageWithRelations[];
    positive: OutreachMessageWithRelations[];
    unanswered: OutreachMessageWithRelations[];
  }> {
    const [replied, positive, unanswered] = await Promise.all([
      this.list({ status: "replied" }),
      this.list({ status: "positive" }),
      this.list({ statusIn: ["sent", "opened"] }),
    ]);
    return { replied, positive, unanswered };
  },
};
