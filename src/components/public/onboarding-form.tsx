"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, FileText, Loader2, Upload, X } from "lucide-react";
import { prepareOnboardingUploadAction, submitOnboardingAction } from "@/app/(public)/onboarding/actions";
import { uploadToSignedUrl } from "./upload";
import { cn } from "@/lib/utils";

type Values = Record<
  | "firma" | "name" | "email" | "telefon" | "adresse" | "plz" | "ort" | "website" | "branche"
  | "beschreibung" | "angebot" | "usp" | "konkurrenz" | "ziele" | "zielgruppe" | "region" | "budget"
  | "zugaenge" | "unterlagen" | "ansprechpartner" | "ansprechpartner_kontakt" | "kommunikation" | "startdatum" | "bemerkungen",
  string
>;
type Up = { id: string; name: string; size: number; progress: number; path?: string; error?: string };
const EMPTY: Values = { firma: "", name: "", email: "", telefon: "", adresse: "", plz: "", ort: "", website: "", branche: "", beschreibung: "", angebot: "", usp: "", konkurrenz: "", ziele: "", zielgruppe: "", region: "", budget: "", zugaenge: "", unterlagen: "", ansprechpartner: "", ansprechpartner_kontakt: "", kommunikation: "", startdatum: "", bemerkungen: "" };
const input = "mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";
const STORE = "ecreator-onboarding";

type Def = { k: keyof Values; label: string; type?: string; ph?: string; area?: boolean; req?: boolean; half?: boolean };
const SECTIONS: Array<{ title: string; hint: string; fields: Def[] }> = [
  {
    title: "Unternehmen & Kontakt",
    hint: "Damit wir alles korrekt erfassen.",
    fields: [
      { k: "firma", label: "Firma", req: true, half: true },
      { k: "name", label: "Dein Name", req: true, half: true },
      { k: "email", label: "E-Mail", type: "email", req: true, half: true },
      { k: "telefon", label: "Telefon", type: "tel", req: true, half: true },
      { k: "adresse", label: "Strasse & Nr." },
      { k: "plz", label: "PLZ", half: true },
      { k: "ort", label: "Ort", half: true },
      { k: "website", label: "Website", ph: "www.beispiel.ch", half: true },
      { k: "branche", label: "Branche", ph: "z. B. Pflege, Gastronomie, Immobilien", half: true },
    ],
  },
  {
    title: "Dein Unternehmen",
    hint: "Erzähl uns, was euch ausmacht.",
    fields: [
      { k: "beschreibung", label: "Was macht ihr?", area: true },
      { k: "angebot", label: "Wichtigste Produkte / Dienstleistungen", area: true },
      { k: "usp", label: "Was macht euch besonders?", area: true },
      { k: "konkurrenz", label: "Wichtigste Mitbewerber" },
    ],
  },
  {
    title: "Ziele & Zielgruppe",
    hint: "Was wollen wir gemeinsam erreichen?",
    fields: [
      { k: "ziele", label: "Marketingziele", area: true, ph: "z. B. mehr Anfragen, neue Mitarbeitende, Bekanntheit" },
      { k: "zielgruppe", label: "Wen wollt ihr erreichen?", area: true },
      { k: "region", label: "Region / Einzugsgebiet", half: true },
      { k: "budget", label: "Werbebudget pro Monat (CHF)", type: "number", half: true },
    ],
  },
  {
    title: "Zugänge & Unterlagen",
    hint: "Bitte hier keine Passwörter eintragen. Die Zugänge richten wir sicher gemeinsam ein.",
    fields: [
      { k: "zugaenge", label: "Welche Konten habt ihr bereits?", area: true, ph: "z. B. Facebook-Seite, Instagram, Google Business, Website-Login" },
      { k: "unterlagen", label: "Logo, CI, Bilder: wo finden wir sie?", area: true, ph: "z. B. Link zu Google Drive / Dropbox" },
    ],
  },
  {
    title: "Zusammenarbeit",
    hint: "So arbeiten wir am besten zusammen.",
    fields: [
      { k: "ansprechpartner", label: "Hauptansprechpartner", half: true },
      { k: "ansprechpartner_kontakt", label: "Kontakt Ansprechpartner", half: true },
      { k: "kommunikation", label: "Bevorzugter Kanal", ph: "WhatsApp, E-Mail, Telefon", half: true },
      { k: "startdatum", label: "Gewünschter Start", type: "date", half: true },
      { k: "bemerkungen", label: "Sonstiges", area: true },
    ],
  },
];

export function OnboardingForm({ token, company }: { token: string | null; company: string | null }) {
  const [v, setV] = useState<Values>({ ...EMPTY, firma: company ?? "" });
  const [files, setFiles] = useState<Up[]>([]);
  const [subId, setSubId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [hp, setHp] = useState("");

  // Zwischenspeicher nur auf diesem Geraet (Komfort, keine Pflicht)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`${STORE}:${token ?? "allg"}`);
      if (raw) setV((s) => ({ ...s, ...(JSON.parse(raw) as Partial<Values>) }));
    } catch {
      /* Speicher nicht verfuegbar */
    }
  }, [token]);
  useEffect(() => {
    try {
      localStorage.setItem(`${STORE}:${token ?? "allg"}`, JSON.stringify(v));
    } catch {
      /* ignorieren */
    }
  }, [v, token]);

  async function addFiles(list: FileList) {
    let id = subId;
    for (const f of Array.from(list).slice(0, 10 - files.length)) {
      const key = crypto.randomUUID();
      setFiles((s) => [...s, { id: key, name: f.name, size: f.size, progress: 0 }]);
      const update = (patch: Partial<Up>) => setFiles((s) => s.map((x) => (x.id === key ? { ...x, ...patch } : x)));
      const r = await prepareOnboardingUploadAction({ submissionId: id, name: f.name, size: f.size, type: f.type || "application/octet-stream" });
      if (!r.ok || !r.data) {
        update({ error: r.ok ? "Upload nicht möglich" : r.error });
        continue;
      }
      id = r.data.submissionId;
      setSubId(id);
      const path = r.data.path;
      try {
        await uploadToSignedUrl(r.data.url, f, (p) => update({ progress: p }));
        update({ progress: 100, path });
      } catch (e) {
        update({ error: e instanceof Error ? e.message : "Upload fehlgeschlagen" });
      }
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (files.some((f) => !f.path && !f.error)) return setError("Bitte warten, bis alle Dateien hochgeladen sind.");
    setBusy(true);
    setError(null);
    const r = await submitOnboardingAction({ ...v, token, submissionId: subId, files: files.filter((f) => f.path).map((f) => ({ path: f.path!, name: f.name, size: f.size })), hp });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    try {
      localStorage.removeItem(`${STORE}:${token ?? "allg"}`);
    } catch {
      /* ignorieren */
    }
    setDone(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (done)
    return (
      <div className="rounded-2xl border border-emerald-200 p-8 text-center" role="status">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" aria-hidden />
        <h2 className="mt-3 text-2xl font-bold">Vielen Dank!</h2>
        <p className="mt-2 text-neutral-600">Dein Onboarding ist bei uns angekommen. Wir melden uns in Kürze für die nächsten Schritte.</p>
      </div>
    );

  return (
    <form onSubmit={submit} className="space-y-6">
      {SECTIONS.map((s, i) => (
        <fieldset key={s.title} className="rounded-2xl border border-neutral-200 p-5 sm:p-6">
          <legend className="px-1 text-lg font-semibold">
            {i + 1}. {s.title}
          </legend>
          <p className="text-sm text-neutral-500">{s.hint}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {s.fields.map((f) => (
              <label key={f.k} className={cn("block text-sm font-medium text-neutral-800", !f.half && "sm:col-span-2")}>
                {f.label}
                {f.req ? " *" : ""}
                {f.area ? (
                  <textarea rows={3} placeholder={f.ph} value={v[f.k]} onChange={(e) => setV({ ...v, [f.k]: e.target.value })} className={cn(input, "py-2")} />
                ) : (
                  <input type={f.type ?? "text"} required={f.req} placeholder={f.ph} value={v[f.k]} onChange={(e) => setV({ ...v, [f.k]: e.target.value })} className={cn(input, "h-11")} min={f.type === "number" ? 0 : undefined} />
                )}
              </label>
            ))}
            {s.title === "Zugänge & Unterlagen" ? (
              <div className="sm:col-span-2">
                <p className="text-sm font-medium text-neutral-800">Logo, Bilder & Unterlagen hochladen</p>
                <p className="text-xs text-neutral-500">Bilder, PDF, ZIP und Office-Dokumente, bis 20 MB pro Datei und 50 MB insgesamt, max. 10 Dateien.</p>
                {files.length ? (
                  <ul className="mt-2 space-y-2">
                    {files.map((f) => (
                      <li key={f.id} className="flex items-center gap-3 rounded-lg border border-neutral-200 p-2.5 text-sm">
                        <FileText className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                        <span className="min-w-0 flex-1 truncate">{f.name}</span>
                        {f.error ? <span className="text-xs text-rose-700">{f.error}</span> : f.path ? <span className="text-xs text-emerald-700">hochgeladen</span> : <span className="text-xs tabular-nums text-neutral-500">{f.progress} %</span>}
                        <button type="button" aria-label={`${f.name} entfernen`} onClick={() => setFiles((l) => l.filter((x) => x.id !== f.id))} className="h-7 w-7 rounded text-neutral-400 hover:bg-neutral-100">
                          <X className="mx-auto h-4 w-4" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {files.length < 10 ? (
                  <label className="mt-2 inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-neutral-300 px-4 text-sm font-medium hover:bg-neutral-50">
                    <Upload className="h-4 w-4" aria-hidden /> Dateien wählen
                    <input
                      type="file"
                      multiple
                      className="sr-only"
                      accept="image/*,application/pdf,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.ai,.eps"
                      onChange={(e) => {
                        if (e.target.files?.length) void addFiles(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                ) : null}
              </div>
            ) : null}
          </div>
        </fieldset>
      ))}
      <div className="hidden" aria-hidden>
        <input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
      </div>
      {error ? <p className="text-sm text-rose-700" role="alert">{error}</p> : null}
      <button type="submit" disabled={busy} className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-lg font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null}
        Onboarding absenden
      </button>
    </form>
  );
}
