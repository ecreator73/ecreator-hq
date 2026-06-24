/**
 * Prompt-Template-Helfer: Variablen im Format {{variable}} extrahieren und
 * ersetzen. Keine hardcoded Prompts - alles kommt aus ai_prompts.
 */

const VAR_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/** Alle eindeutigen Variablennamen aus einem Template. */
export function extractVariables(template: string | null | undefined): string[] {
  if (!template) return [];
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  VAR_RE.lastIndex = 0;
  while ((m = VAR_RE.exec(template)) !== null) {
    found.add(m[1]!);
  }
  return [...found];
}

export interface RenderResult {
  text: string;
  /** Variablen, die im Template vorkamen, aber keinen Wert hatten. */
  missing: string[];
}

/**
 * Ersetzt {{var}} durch Werte. Fehlende Variablen werden gesammelt; im
 * strikten Modus wird ihr Platzhalter beibehalten, sonst durch "" ersetzt.
 */
export function renderTemplate(
  template: string | null | undefined,
  values: Record<string, unknown>,
  opts: { keepMissing?: boolean } = {},
): RenderResult {
  if (!template) return { text: "", missing: [] };
  const missing = new Set<string>();
  const text = template.replace(VAR_RE, (_full, name: string) => {
    const v = values[name];
    if (v === undefined || v === null || v === "") {
      missing.add(name);
      return opts.keepMissing ? `{{${name}}}` : "";
    }
    return String(v);
  });
  return { text, missing: [...missing] };
}
