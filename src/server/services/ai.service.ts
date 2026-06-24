import { getContext, ServiceError } from "./_helpers";
import { recordAudit } from "@/lib/activity";
import { aiPromptsService } from "./prompt.service";
import type { AiRun } from "@/types/entities";

const SELECT = `*, prompt:ai_prompts!ai_runs_prompt_id_fkey(id,name)`;

export interface AiRunFilters {
  promptId?: string;
  status?: string;
  entityType?: string;
}

export interface AiRunLogInput {
  prompt_id?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  input_data?: Record<string, unknown> | null;
  output_data?: Record<string, unknown> | null;
  model?: string | null;
  status?: string;
  error_message?: string | null;
  token_usage?: number | null;
  cost_estimate?: number | null;
}

function mapRow(row: Record<string, unknown>): AiRun {
  const { prompt, ...rest } = row as Record<string, unknown> & { prompt?: unknown };
  return {
    ...(rest as object),
    prompt: (prompt as AiRun["prompt"]) ?? null,
  } as AiRun;
}

export const aiRunsService = {
  async list(filters: AiRunFilters = {}): Promise<AiRun[]> {
    const { supabase } = await getContext();
    let q = supabase
      .from("ai_runs")
      .select(SELECT)
      .order("created_at", { ascending: false });
    if (filters.promptId) q = q.eq("prompt_id", filters.promptId);
    if (filters.status) q = q.eq("status", filters.status);
    if (filters.entityType) q = q.eq("entity_type", filters.entityType);
    const { data, error } = await q.limit(500);
    if (error) throw new ServiceError("AI-Runs konnten nicht geladen werden", error);
    return ((data ?? []) as unknown as Array<Record<string, unknown>>).map(mapRow);
  },

  async getById(id: string): Promise<AiRun | null> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("ai_runs")
      .select(SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new ServiceError("AI-Run konnte nicht geladen werden", error);
    return data ? mapRow(data as Record<string, unknown>) : null;
  },

  /** Einen AI-Run protokollieren (von Engines genutzt). */
  async log(input: AiRunLogInput): Promise<AiRun> {
    const { supabase } = await getContext();
    const { data, error } = await supabase
      .from("ai_runs")
      .insert({
        prompt_id: input.prompt_id ?? null,
        entity_type: input.entity_type ?? null,
        entity_id: input.entity_id ?? null,
        input_data: input.input_data ?? null,
        output_data: input.output_data ?? null,
        model: input.model ?? null,
        status: input.status ?? "success",
        error_message: input.error_message ?? null,
        token_usage: input.token_usage ?? null,
        cost_estimate: input.cost_estimate ?? null,
      })
      .select(SELECT)
      .single();
    if (error) throw new ServiceError("AI-Run konnte nicht protokolliert werden", error);
    const row = mapRow(data as Record<string, unknown>);
    await recordAudit({ action: "ai_run.started", entityType: "ai_run", entityId: row.id });
    return row;
  },

  /**
   * Test-Run eines Prompts: Template rendern und als ai_run protokollieren.
   * Kein Live-AI-Call in dieser Phase - das Ergebnis ist eine Vorschau des
   * gerenderten Prompts. Fehlende Variablen ergeben einen Fehler-Run.
   */
  async testRun(promptId: string, values: Record<string, unknown>): Promise<AiRun> {
    const prompt = await aiPromptsService.getById(promptId);
    if (!prompt) throw new ServiceError("Prompt nicht gefunden");
    const rendered = await aiPromptsService.render(promptId, values);
    const hasMissing = rendered.missing.length > 0;
    return this.log({
      prompt_id: promptId,
      entity_type: "ai_prompt",
      entity_id: promptId,
      input_data: values,
      model: prompt.model ?? null,
      status: hasMissing ? "error" : "success",
      error_message: hasMissing
        ? `Fehlende Variablen: ${rendered.missing.join(", ")}`
        : null,
      output_data: hasMissing
        ? null
        : {
            note: "Vorschau - keine Live-AI-Verbindung in dieser Phase.",
            system_prompt: rendered.system,
            user_prompt: rendered.user,
          },
      token_usage: 0,
      cost_estimate: 0,
    });
  },
};
