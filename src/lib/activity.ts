import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Zwei getrennte Beobachtungsebenen gemaess Blueprint (00 §8):
 *  - `activity_logs`: fachlicher Feed sichtbarer Aenderungen (logActivity)
 *  - `audits`:        revisionssicherer Trail mit alt/neu-Werten (recordAudit)
 * Beide schreiben "best effort" - Logging bricht nie den Nutzerfluss.
 */

interface ActivityInput {
  action: string;
  entityType?: string;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
}

export async function logActivity(input: ActivityInput): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("activity_logs").insert({
      actor_id: user.id,
      action: input.action,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      summary: input.summary,
      metadata: input.metadata ?? {},
    });
  } catch {
    // Logging darf den Request nie zum Scheitern bringen.
  }
}

interface AuditInput {
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
}

/**
 * Schreibt einen revisionssicheren Eintrag in `audits` (wer, was, wann, alt/neu).
 * Erfuellt die Prompt-2-Anforderung old_value/new_value, ohne `activity_logs`
 * zu duplizieren.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("audits").insert({
      actor_id: user.id,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      old_values: (input.oldValues ?? null) as never,
      new_values: (input.newValues ?? null) as never,
    });
  } catch {
    // Audit darf den Request nie zum Scheitern bringen.
  }
}
