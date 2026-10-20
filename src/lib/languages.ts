/**
 * Sprachen aus Freitext ("Deutsch, Englisch", "deutsch/engl", "Schwiizerdütsch")
 * in die Sprach-Codes des Creator-Pools uebersetzen (wie beim Lovable-Import).
 */
const LANG: Record<string, string> = {
  deutsch: "de", de: "de", german: "de", hochdeutsch: "de",
  schweizerdeutsch: "gsw", "schweizer deutsch": "gsw", "schwiizerdütsch": "gsw", "schwizerdütsch": "gsw", berndeutsch: "gsw", "(schweizer)deutsch": "gsw", mundart: "gsw",
  englisch: "en", english: "en", engl: "en", en: "en",
  "französisch": "fr", franzoesisch: "fr", french: "fr", fr: "fr", "français": "fr",
  italienisch: "it", italian: "it", it: "it", italiano: "it",
  spanisch: "es", spanish: "es", es: "es", "español": "es",
  portugiesisch: "pt", portuguiesisch: "pt", portuguese: "pt", "português": "pt",
  "türkisch": "tr", turkish: "tr", serbisch: "sr", albanisch: "sq", arabisch: "ar", russisch: "ru", tamilisch: "ta", tamil: "ta", lingala: "ln",
};

export function normalizeLanguages(input: string | string[] | null | undefined): string[] {
  const parts = (Array.isArray(input) ? input : [input]).flatMap((v) => String(v ?? "").split(/[,/;&+]|\s+und\s+/i));
  const out = new Set<string>();
  for (const p of parts) {
    const whole = p.trim().toLowerCase();
    if (!whole) continue;
    if (LANG[whole]) {
      out.add(LANG[whole]);
      continue;
    }
    for (const w of whole.split(/\s+/)) if (LANG[w]) out.add(LANG[w]);
    if (/schweizer/.test(whole) && /deutsch/.test(whole)) out.add("gsw");
  }
  return [...out];
}

/** Instagram/TikTok: aus Link oder @handle den reinen Namen holen. */
export function socialHandle(v: string | null | undefined): string | null {
  const s = (v ?? "").trim();
  if (!s) return null;
  const m = s.match(/(?:instagram\.com|tiktok\.com)\/@?([^/?#\s]+)/i);
  return (m ? m[1]! : s).replace(/^@/, "").trim().slice(0, 60) || null;
}
