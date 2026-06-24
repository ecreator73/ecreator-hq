import { getContext, ServiceError } from "./_helpers";
import { recordAudit, logActivity } from "@/lib/activity";
import { extractVariables, renderTemplate } from "@/lib/ai-prompt";
import {
  aiPromptInsertSchema,
  aiPromptUpdateSchema,
  type AiPromptCreateInput,
  type AiPromptUpdateInput,
} from "@/lib/validation/ai";
import type { AiPrompt } from "@/types/entities";

export interface PromptFilters {
  category?: string;
  status?: string;
  search?: string;
}

/** Variablen aus Templates ableiten, falls nicht explizit gesetzt. */
function withDerivedVariables<
  T extends { variables?: string[]; system_prompt?: string | null; user_prompt_template?: string | null },
>(parsed: T): T {
  if (parsed.variables && parsed.variables.length > 0) return parsed;
  const derived = [
    ...extractVariables(parsed.system_prompt ?? null),
    ...extractVariables(parsed.user_prompt_template ?? null),
  ];
  return { ...parsed, variables: [...new Set(derived)] };
}

export const aiPromptsService = {
  async list(filters: PromptFilters = {}): Promise<AiPrompt[]> {
    const { supabase } = await getContext();
    let q = supabase
      .from("ai_prompts")
      .select("*")
      .is("deleted_at", null)
      .order("name", { ascending: true });
    if (filters.category) q = q.eq("category", filters.category);
    if (filters.status) q = q.eq("status", filters.status);
    if (filters.search) {
      const like = `%${filters.search.trim()}%`;
      q = q.or(`name.ilike.${like},description.ilike.${like}`);
    }
    const { data, error } = await q.limit(500);
    if (error) throw new ServiceError("Prompts konnten nicht geladen werden", error);
    return (data ?? []) as unknown as AiPrompt[];
  },

  async getById(id: string): Promise<AiPrompt | null> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("ai_prompts")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new ServiceError("Prompt konnte nicht geladen werden", error);
    return (data as unknown as AiPrompt) ?? null;
  },

  async create(input: AiPromptCreateInput): Promise<AiPrompt> {
    const parsed = withDerivedVariables(aiPromptInsertSchema.parse(input));
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("ai_prompts")
      .insert(parsed)
      .select("*")
      .single();
    if (error) throw new ServiceError("Prompt konnte nicht erstellt werden", error);
    const row = data as unknown as AiPrompt;
    await recordAudit({ action: "create", entityType: "ai_prompt", entityId: row.id, newValues: row });
    await logActivity({ action: "ai_prompt.created", entityType: "ai_prompt", entityId: row.id, summary: `Prompt "${row.name}" erstellt` });
    return row;
  },

  async update(id: string, input: AiPromptUpdateInput): Promise<AiPrompt> {
    const parsed = withDerivedVariables(aiPromptUpdateSchema.parse(input));
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("ai_prompts")
      .update(parsed)
      .eq("id", id)
      .is("deleted_at", null)
      .select("*")
      .single();
    if (error) throw new ServiceError("Prompt konnte nicht aktualisiert werden", error);
    const row = data as unknown as AiPrompt;
    await recordAudit({ action: "update", entityType: "ai_prompt", entityId: id, newValues: row });
    await logActivity({ action: "ai_prompt.updated", entityType: "ai_prompt", entityId: id, summary: `Prompt "${row.name}" geaendert` });
    return row;
  },

  async setStatus(id: string, status: string): Promise<AiPrompt> {
    return this.update(id, { status: status as AiPromptUpdateInput["status"] });
  },

  async remove(id: string): Promise<void> {
    const { supabase, userId } = await getContext();
    const { error } = await supabase
      .from("ai_prompts")
      .update({ deleted_at: new Date().toISOString(), updated_by: userId })
      .eq("id", id)
      .is("deleted_at", null);
    if (error) throw new ServiceError("Prompt konnte nicht geloescht werden", error);
    await recordAudit({ action: "delete", entityType: "ai_prompt", entityId: id });
  },

  /** Template mit Werten rendern (System- + User-Prompt). */
  async render(
    id: string,
    values: Record<string, unknown>,
  ): Promise<{ system: string; user: string; missing: string[] }> {
    const prompt = await this.getById(id);
    if (!prompt) throw new ServiceError("Prompt nicht gefunden");
    const sys = renderTemplate(prompt.system_prompt, values, { keepMissing: true });
    const usr = renderTemplate(prompt.user_prompt_template, values, { keepMissing: true });
    return {
      system: sys.text,
      user: usr.text,
      missing: [...new Set([...sys.missing, ...usr.missing])],
    };
  },
};
