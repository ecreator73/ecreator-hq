"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, FileText, Loader2, Upload, X } from "lucide-react";
import { prepareCreatorUploadAction, submitCreatorApplicationAction } from "@/app/(public)/model/actions";
import { track, uploadToSignedUrl } from "./upload";
import { cn } from "@/lib/utils";

const EXPERIENCE = ["Keine Erfahrung", "Erste Erfahrungen", "Regelmässig vor der Kamera", "Professionelles Model / Creator"];
type FileState = { file: File; progress: number; path?: string; error?: string } | null;
const field = "mt-1 block h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

function Field({ label, error, children, hint }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-neutral-800">
      {label}
      {children}
      {hint ? <span className="mt-1 block text-xs font-normal text-neutral-500">{hint}</span> : null}
      {error ? <span className="mt-1 block text-xs font-medium text-rose-700">{error}</span> : null}
    </label>
  );
}

function Picker({ kind, state, accept, label, hint, onPick, onRemove }: { kind: string; state: FileState; accept: string; label: string; hint: string; onPick: (f: File) => void; onRemove: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-4">
      <p className="text-sm text-neutral-600">{hint}</p>
      {state ? (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-neutral-200 p-3">
          <FileText className="h-5 w-5 shrink-0 text-brand-600" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{state.file.name}</p>
            {state.error ? (
              <p className="text-xs text-rose-700">{state.error}</p>
            ) : (
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-100" role="progressbar" aria-valuenow={state.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Upload ${kind}`}>
                <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${state.progress}%` }} />
              </div>
            )}
          </div>
          <button type="button" onClick={onRemove} aria-label={`${label} entfernen`} className="h-8 w-8 rounded-md text-neutral-400 hover:bg-neutral-100">
            <X className="mx-auto h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()} className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-300 px-4 text-sm font-medium hover:bg-neutral-50">
          <Upload className="h-4 w-4" aria-hidden /> {label}
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onPick(f);
        }}
      />
    </div>
  );
}

export function CreatorApplicationForm() {
  const [v, setV] = useState({ first_name: "", last_name: "", email: "", phone: "", birthdate: "", location: "", instagram: "", tiktok: "", languages: "", experience: "", rate_expectation: "", portfolio_url: "", about: "", website: "" });
  const [privacy, setPrivacy] = useState(false);
  const [video, setVideo] = useState<FileState>(null);
  const [photo, setPhoto] = useState<FileState>(null);
  const [appId, setAppId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const started = useRef(false);

  useEffect(() => track("creator_page_view"), []);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (!started.current) {
      started.current = true;
      track("creator_form_start");
    }
    setV((s) => ({ ...s, [k]: e.target.value }));
  };

  async function upload(kind: "video" | "photo", f: File, setState: (s: FileState) => void) {
    setState({ file: f, progress: 0 });
    const r = await prepareCreatorUploadAction({ applicationId: appId, kind, name: f.name, size: f.size, type: f.type });
    if (!r.ok || !r.data) return setState({ file: f, progress: 0, error: r.ok ? "Upload nicht möglich" : r.error });
    setAppId(r.data.applicationId);
    const path = r.data.path;
    try {
      await uploadToSignedUrl(r.data.url, f, (p) => setState({ file: f, progress: p }));
      setState({ file: f, progress: 100, path });
      if (kind === "video") track("creator_video_upload");
    } catch (e) {
      setState({ file: f, progress: 0, error: e instanceof Error ? e.message : "Upload fehlgeschlagen" });
    }
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!v.first_name.trim()) e.first_name = "Bitte Vorname angeben";
    if (!v.last_name.trim()) e.last_name = "Bitte Nachname angeben";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = "Bitte gültige E-Mail angeben";
    if (v.phone.trim().length < 5) e.phone = "Bitte Telefonnummer angeben";
    if (!v.birthdate) e.birthdate = "Bitte Geburtsdatum angeben";
    if (v.location.trim().length < 2) e.location = "Bitte Wohnort / Kanton angeben";
    if (v.languages.trim().length < 2) e.languages = "Bitte Sprachen angeben";
    if (!v.experience) e.experience = "Bitte Erfahrung auswählen";
    if (video && !video.path) e.video = video.error ? "Bitte gültiges Video wählen oder entfernen" : "Video wird noch hochgeladen";
    if (photo && !photo.path) e.photo = photo.error ? "Bitte gültige Datei wählen oder entfernen" : "Datei wird noch hochgeladen";
    if (!privacy) e.privacy = "Bitte Datenschutz bestätigen";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !validate()) return;
    setBusy(true);
    setError(null);
    track("creator_application_submit");
    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
      const val = params.get(k);
      if (val) utm[k] = val.slice(0, 200);
    }
    const r = await submitCreatorApplicationAction({ ...v, experience: v.experience as (typeof EXPERIENCE)[number], applicationId: appId, privacy: true, videoPath: video?.path ?? null, photoPath: photo?.path ?? null, utm, referrer: document.referrer.slice(0, 300) || undefined } as Parameters<typeof submitCreatorApplicationAction>[0]);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    track("creator_application_success");
    setDone(true);
    window.scrollTo({ top: document.getElementById("bewerben")?.offsetTop ?? 0, behavior: "smooth" });
  }

  if (done)
    return (
      <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center" role="status">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" aria-hidden />
        <h3 className="mt-3 text-2xl font-bold">Willkommen im nächsten Schritt</h3>
        <p className="mt-2 text-neutral-600">Danke für deine Bewerbung! Wir schauen uns dein Profil an und melden uns bei dir, wenn es für unser Creator-Netzwerk passt.</p>
      </div>
    );

  return (
    <form onSubmit={submit} noValidate className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Vorname *" error={errors.first_name}>
          <input autoComplete="given-name" value={v.first_name} onChange={set("first_name")} className={field} />
        </Field>
        <Field label="Nachname *" error={errors.last_name}>
          <input autoComplete="family-name" value={v.last_name} onChange={set("last_name")} className={field} />
        </Field>
        <Field label="E-Mail *" error={errors.email}>
          <input type="email" autoComplete="email" value={v.email} onChange={set("email")} className={field} />
        </Field>
        <Field label="Telefon / WhatsApp *" error={errors.phone}>
          <input type="tel" autoComplete="tel" value={v.phone} onChange={set("phone")} className={field} />
        </Field>
        <Field label="Geburtsdatum *" error={errors.birthdate} hint="Wir speichern nur den Jahrgang.">
          <input type="date" value={v.birthdate} onChange={set("birthdate")} className={field} />
        </Field>
        <Field label="Wohnort / Kanton *" error={errors.location}>
          <input placeholder="z. B. Zürich" value={v.location} onChange={set("location")} className={field} />
        </Field>
        <Field label="Instagram">
          <input placeholder="@deinname" value={v.instagram} onChange={set("instagram")} className={field} />
        </Field>
        <Field label="TikTok">
          <input placeholder="@deinname" value={v.tiktok} onChange={set("tiktok")} className={field} />
        </Field>
        <Field label="Sprachen *" error={errors.languages}>
          <input placeholder="z. B. Deutsch, Englisch" value={v.languages} onChange={set("languages")} className={field} />
        </Field>
        <Field label="Erfahrung *" error={errors.experience}>
          <select value={v.experience} onChange={set("experience")} className={field}>
            <option value="">Bitte wählen</option>
            {EXPERIENCE.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Vergütungsvorstellung (optional)" hint="Hilft uns, dich passenden Aufträgen zuzuordnen, kein Muss.">
        <input placeholder="z. B. pro Stunde oder Pauschale pro Shooting" value={v.rate_expectation} onChange={set("rate_expectation")} className={field} />
      </Field>

      <div>
        <p className="text-sm font-semibold">Zeig uns kurz, wer du bist (optional)</p>
        <div className="mt-2">
          <Picker
            kind="Video"
            state={video}
            accept="video/mp4,video/quicktime,video/webm"
            label="Video hochladen"
            hint="Ein kurzes Smartphone-Video reicht völlig. MP4, MOV oder WEBM, max. 50 MB. Grössere Videos bitte unten als Link angeben."
            onPick={(f) => upload("video", f, setVideo)}
            onRemove={() => setVideo(null)}
          />
          {errors.video ? <p className="mt-1 text-xs font-medium text-rose-700">{errors.video}</p> : null}
        </div>
      </div>
      <Field label="Portfolio / Video-Link (optional)">
        <input placeholder="Google Drive, Dropbox, WeTransfer, Instagram …" value={v.portfolio_url} onChange={set("portfolio_url")} className={field} />
      </Field>
      <div>
        <p className="text-sm font-semibold">Foto oder Dokument hochladen (optional)</p>
        <div className="mt-2">
          <Picker
            kind="Foto"
            state={photo}
            accept="image/jpeg,image/png,image/webp,application/pdf"
            label="Foto oder Dokument hochladen"
            hint="Ein aktuelles Foto oder z. B. eine Sedcard. Kein professionelles Bewerbungsfoto nötig. JPG, PNG, WEBP oder PDF, max. 20 MB."
            onPick={(f) => upload("photo", f, setPhoto)}
            onRemove={() => setPhoto(null)}
          />
          {errors.photo ? <p className="mt-1 text-xs font-medium text-rose-700">{errors.photo}</p> : null}
        </div>
      </div>
      <Field label="Erzähl uns kurz etwas über dich (optional)">
        <textarea rows={4} placeholder="Was machst du und welche Art von Content liegt dir?" value={v.about} onChange={set("about")} className={cn(field, "h-auto py-2")} />
      </Field>
      {/* Honeypot gegen Spam: fuer Menschen unsichtbar */}
      <div className="hidden" aria-hidden>
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={v.website} onChange={set("website")} />
        </label>
      </div>
      <label className="flex items-start gap-3 text-sm text-neutral-700">
        <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} className="mt-1 h-4 w-4" />
        <span>
          Ich stimme zu, dass eCreator meine Angaben und hochgeladenen Inhalte zur Bearbeitung meiner Bewerbung und für die Kontaktaufnahme verwenden darf.{" "}
          <a href="https://www.ecreator.ch/datenschutz" target="_blank" rel="noreferrer" className="text-brand-700 underline">
            Datenschutzerklärung
          </a>
        </span>
      </label>
      {errors.privacy ? <p className="-mt-3 text-xs font-medium text-rose-700">{errors.privacy}</p> : null}
      {Object.keys(errors).length ? <p className="text-sm text-rose-700">Bitte prüfe die markierten Felder.</p> : null}
      {error ? <p className="text-sm text-rose-700" role="alert">{error}</p> : null}
      <button type="submit" disabled={busy} className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-lg font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
        {busy ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Bewerbung wird gesendet …
          </>
        ) : (
          "Jetzt bewerben"
        )}
      </button>
    </form>
  );
}
