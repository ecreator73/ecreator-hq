/** Formular-Typen der Website (Lead-ID-Praefix kt_/rr_/gc_/sc_) und Calendly. */
export const FORM_TYPES = [
  { value: "kontakt", label: "Kontaktformular" },
  { value: "rueckruf", label: "Rückruf" },
  { value: "growth-check", label: "Growth Check" },
  { value: "strategie-call", label: "Strategie-Call (Website)" },
  { value: "calendly", label: "Calendly direkt" },
] as const;

export const FORM_LABELS: Record<string, string> = Object.fromEntries(FORM_TYPES.map((f) => [f.value, f.label]));

export function formLabel(v: string | null | undefined): string {
  if (!v) return "–";
  return FORM_LABELS[v] ?? v;
}
