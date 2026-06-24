import { getContext, ServiceError } from "./_helpers";
import { recordAudit } from "@/lib/activity";
import { extractVariables } from "@/lib/ai-prompt";
import {
  campaignInsertSchema,
  campaignUpdateSchema,
  emailTemplateInsertSchema,
  emailTemplateUpdateSchema,
  followUpSequenceInsertSchema,
  bookedMeetingInsertSchema,
  bookedMeetingUpdateSchema,
  unsubscribeInsertSchema,
  type CampaignCreateInput,
  type CampaignUpdateInput,
  type EmailTemplateCreateInput,
  type EmailTemplateUpdateInput,
  type FollowUpSequenceCreateInput,
  type BookedMeetingCreateInput,
  type BookedMeetingUpdateInput,
  type UnsubscribeCreateInput,
} from "@/lib/validation/outreach";
import type {
  OutreachCampaign,
  EmailTemplate,
  FollowUpSequence,
  BookedMeetingWithRelations,
  Unsubscribe,
} from "@/types/entities";

export const outreachCampaignsService = {
  async list(): Promise<OutreachCampaign[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("outreach_campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new ServiceError("Kampagnen konnten nicht geladen werden", error);
    return (data ?? []) as unknown as OutreachCampaign[];
  },
  async create(input: CampaignCreateInput): Promise<OutreachCampaign> {
    const parsed = campaignInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("outreach_campaigns").insert(parsed).select("*").single();
    if (error) throw new ServiceError("Kampagne konnte nicht erstellt werden", error);
    const row = data as unknown as OutreachCampaign;
    await recordAudit({ action: "create", entityType: "outreach_campaign", entityId: row.id, newValues: row });
    return row;
  },
  async update(id: string, input: CampaignUpdateInput): Promise<OutreachCampaign> {
    const parsed = campaignUpdateSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("outreach_campaigns").update(parsed).eq("id", id).select("*").single();
    if (error) throw new ServiceError("Kampagne konnte nicht aktualisiert werden", error);
    return data as unknown as OutreachCampaign;
  },
  async remove(id: string): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase.from("outreach_campaigns").delete().eq("id", id);
    if (error) throw new ServiceError("Kampagne konnte nicht geloescht werden", error);
  },
};

export const emailTemplatesService = {
  async list(activeOnly = false): Promise<EmailTemplate[]> {
    const { supabase } = await getContext();
    let q = supabase.from("email_templates").select("*").order("name", { ascending: true });
    if (activeOnly) q = q.eq("active", true);
    const { data, error } = await q;
    if (error) throw new ServiceError("Templates konnten nicht geladen werden", error);
    return (data ?? []) as unknown as EmailTemplate[];
  },
  async getById(id: string): Promise<EmailTemplate | null> {
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("email_templates").select("*").eq("id", id).maybeSingle();
    if (error) throw new ServiceError("Template konnte nicht geladen werden", error);
    return (data as unknown as EmailTemplate) ?? null;
  },
  async create(input: EmailTemplateCreateInput): Promise<EmailTemplate> {
    const parsed = emailTemplateInsertSchema.parse(input);
    if (!parsed.variables || parsed.variables.length === 0) {
      parsed.variables = [
        ...new Set([...extractVariables(parsed.subject ?? null), ...extractVariables(parsed.body ?? null)]),
      ];
    }
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("email_templates").insert(parsed).select("*").single();
    if (error) throw new ServiceError("Template konnte nicht erstellt werden", error);
    const row = data as unknown as EmailTemplate;
    await recordAudit({ action: "create", entityType: "email_template", entityId: row.id, newValues: row });
    return row;
  },
  async update(id: string, input: EmailTemplateUpdateInput): Promise<EmailTemplate> {
    const parsed = emailTemplateUpdateSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("email_templates").update(parsed).eq("id", id).select("*").single();
    if (error) throw new ServiceError("Template konnte nicht aktualisiert werden", error);
    return data as unknown as EmailTemplate;
  },
  async remove(id: string): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase.from("email_templates").delete().eq("id", id);
    if (error) throw new ServiceError("Template konnte nicht geloescht werden", error);
  },
};

export const followUpSequencesService = {
  async list(): Promise<FollowUpSequence[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("follow_up_sequences").select("*").order("name", { ascending: true });
    if (error) throw new ServiceError("Sequenzen konnten nicht geladen werden", error);
    return (data ?? []) as unknown as FollowUpSequence[];
  },
  async create(input: FollowUpSequenceCreateInput): Promise<FollowUpSequence> {
    const parsed = followUpSequenceInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("follow_up_sequences").insert(parsed).select("*").single();
    if (error) throw new ServiceError("Sequenz konnte nicht erstellt werden", error);
    return data as unknown as FollowUpSequence;
  },
  async remove(id: string): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase.from("follow_up_sequences").delete().eq("id", id);
    if (error) throw new ServiceError("Sequenz konnte nicht geloescht werden", error);
  },
};

const MEETING_SELECT = `*, lead:leads!booked_meetings_lead_id_fkey(id,company_name)`;
function mapMeeting(row: Record<string, unknown>): BookedMeetingWithRelations {
  const { lead, ...rest } = row as Record<string, unknown> & { lead?: unknown };
  return { ...(rest as object), lead: (lead as BookedMeetingWithRelations["lead"]) ?? null } as BookedMeetingWithRelations;
}

export const bookedMeetingsService = {
  async list(): Promise<BookedMeetingWithRelations[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("booked_meetings")
      .select(MEETING_SELECT)
      .order("date", { ascending: true, nullsFirst: false });
    if (error) throw new ServiceError("Termine konnten nicht geladen werden", error);
    return ((data ?? []) as unknown as Array<Record<string, unknown>>).map(mapMeeting);
  },
  async create(input: BookedMeetingCreateInput): Promise<BookedMeetingWithRelations> {
    const parsed = bookedMeetingInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("booked_meetings").insert(parsed).select(MEETING_SELECT).single();
    if (error) throw new ServiceError("Termin konnte nicht erstellt werden", error);
    const row = mapMeeting(data as Record<string, unknown>);
    await recordAudit({ action: "create", entityType: "booked_meeting", entityId: row.id, newValues: row });
    return row;
  },
  async update(id: string, input: BookedMeetingUpdateInput): Promise<BookedMeetingWithRelations> {
    const parsed = bookedMeetingUpdateSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("booked_meetings").update(parsed).eq("id", id).select(MEETING_SELECT).single();
    if (error) throw new ServiceError("Termin konnte nicht aktualisiert werden", error);
    return mapMeeting(data as Record<string, unknown>);
  },
  async setStatus(id: string, status: string): Promise<BookedMeetingWithRelations> {
    return this.update(id, { status: status as BookedMeetingUpdateInput["status"] });
  },
  async remove(id: string): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase.from("booked_meetings").delete().eq("id", id);
    if (error) throw new ServiceError("Termin konnte nicht geloescht werden", error);
  },
};

export const unsubscribesService = {
  async list(): Promise<Unsubscribe[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("unsubscribes").select("*").order("unsubscribed_at", { ascending: false });
    if (error) throw new ServiceError("Abmeldungen konnten nicht geladen werden", error);
    return (data ?? []) as unknown as Unsubscribe[];
  },
  async isUnsubscribed(email: string | null | undefined): Promise<boolean> {
    if (!email) return false;
    const { supabase } = await getContext();
    const { count } = await supabase
      .from("unsubscribes")
      .select("id", { count: "exact", head: true })
      .eq("email", email.trim().toLowerCase());
    return (count ?? 0) > 0;
  },
  async add(input: UnsubscribeCreateInput): Promise<void> {
    const parsed = unsubscribeInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { error } = await supabase
      .from("unsubscribes")
      .upsert({ email: parsed.email.toLowerCase(), reason: parsed.reason }, { onConflict: "org_id,email" });
    if (error) throw new ServiceError("Abmeldung konnte nicht gespeichert werden", error);
    await recordAudit({ action: "create", entityType: "unsubscribe", entityId: parsed.email });
  },
};
