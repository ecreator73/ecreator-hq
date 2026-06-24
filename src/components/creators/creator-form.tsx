"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CREATOR_STATUSES,
  CREATOR_TYPES,
  CREATOR_LANGUAGES,
  EXPERIENCE_LEVELS,
  GENDERS,
  CREATOR_GROUP_STATUSES,
} from "@/config/catalog";
import {
  createCreatorAction,
  updateCreatorAction,
} from "@/app/(app)/production/creators/actions";
import type { CreatorCreateInput } from "@/lib/validation/creators";
import type { CreatorWithStats } from "@/types/entities";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

/** Rappen -> CHF-Anzeigewert ("" wenn null). */
function rappenToChf(r: number | null | undefined): string {
  return r == null ? "" : String(r / 100);
}
/** CHF-Eingabe -> Rappen (undefined wenn leer/ungueltig). */
function chfToRappen(chf: string): number | undefined {
  const t = chf.trim();
  if (t === "") return undefined;
  const n = Number(t.replace(",", "."));
  if (Number.isNaN(n)) return undefined;
  return Math.round(n * 100);
}
/** Numerische Eingabe -> number|undefined. */
function numOrUndef(v: string): number | undefined {
  const t = v.trim();
  if (t === "") return undefined;
  const n = Number(t);
  return Number.isNaN(n) ? undefined : n;
}

export function CreatorForm({
  mode,
  id,
  initial,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  id?: string;
  initial?: CreatorWithStats | null;
  onDone?: (result: { id?: string }) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState({
    first_name: initial?.first_name ?? "",
    last_name: initial?.last_name ?? "",
    gender: initial?.gender ?? "",
    birth_year: initial?.birth_year != null ? String(initial.birth_year) : "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    city: initial?.city ?? "",
    canton: initial?.canton ?? "",
    country: initial?.country ?? "",
    travel_available: initial?.travel_available ?? false,
    instagram_handle: initial?.instagram_handle ?? "",
    instagram_followers:
      initial?.instagram_followers != null
        ? String(initial.instagram_followers)
        : "",
    tiktok_handle: initial?.tiktok_handle ?? "",
    tiktok_followers:
      initial?.tiktok_followers != null
        ? String(initial.tiktok_followers)
        : "",
    experience_level: initial?.experience_level ?? "",
    hourly_rate: rappenToChf(initial?.hourly_rate),
    half_day_rate: rappenToChf(initial?.half_day_rate),
    full_day_rate: rappenToChf(initial?.full_day_rate),
    travel_costs: rappenToChf(initial?.travel_costs),
    additional_costs: rappenToChf(initial?.additional_costs),
    status: initial?.status ?? "new",
    score: initial?.score != null ? String(initial.score) : "",
    creator_group_status: initial?.creator_group_status ?? "not_invited",
    tags: (initial?.tags ?? []).join(", "),
    consent_given: initial?.consent_given ?? false,
    consent_date: initial?.consent_date
      ? initial.consent_date.slice(0, 10)
      : "",
    consent_note: initial?.consent_note ?? "",
    notes: initial?.notes ?? "",
  });
  const [creatorTypes, setCreatorTypes] = useState<string[]>(
    initial?.creator_types ?? [],
  );
  const [languages, setLanguages] = useState<string[]>(
    initial?.languages ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggle(
    list: string[],
    setter: (v: string[]) => void,
    key: string,
  ) {
    setter(list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);
  }

  function submit() {
    setError(null);
    if (!form.first_name.trim()) {
      setError("Bitte einen Vornamen eingeben.");
      return;
    }
    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const input: CreatorCreateInput = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim() || undefined,
      gender: (form.gender || undefined) as CreatorCreateInput["gender"],
      birth_year: numOrUndef(form.birth_year),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      city: form.city.trim() || undefined,
      canton: form.canton.trim() || undefined,
      country: form.country.trim() || undefined,
      travel_available: form.travel_available,
      instagram_handle: form.instagram_handle.trim() || undefined,
      instagram_followers: numOrUndef(form.instagram_followers),
      tiktok_handle: form.tiktok_handle.trim() || undefined,
      tiktok_followers: numOrUndef(form.tiktok_followers),
      creator_types: creatorTypes,
      languages,
      experience_level: (form.experience_level ||
        undefined) as CreatorCreateInput["experience_level"],
      hourly_rate: chfToRappen(form.hourly_rate),
      half_day_rate: chfToRappen(form.half_day_rate),
      full_day_rate: chfToRappen(form.full_day_rate),
      travel_costs: chfToRappen(form.travel_costs),
      additional_costs: chfToRappen(form.additional_costs),
      status: (form.status || undefined) as CreatorCreateInput["status"],
      score: numOrUndef(form.score),
      creator_group_status: (form.creator_group_status ||
        undefined) as CreatorCreateInput["creator_group_status"],
      tags,
      consent_given: form.consent_given,
      consent_date: form.consent_date || undefined,
      consent_note: form.consent_note.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createCreatorAction(input)
          : await updateCreatorAction(id as string, input);
      if (result.ok) onDone?.({ id: result.ok ? result.data?.id : undefined });
      else setError(result.error);
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-6"
    >
      {/* Stammdaten */}
      <Group title="Stammdaten">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Vorname *">
            <input
              autoFocus
              value={form.first_name}
              onChange={(e) => set("first_name", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Nachname">
            <input
              value={form.last_name}
              onChange={(e) => set("last_name", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Geschlecht">
            <select
              value={form.gender}
              onChange={(e) => set("gender", e.target.value)}
              className={inputClass}
            >
              <option value="">- keine Angabe -</option>
              {GENDERS.map((g) => (
                <option key={g.key} value={g.key}>
                  {g.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Geburtsjahr">
            <input
              type="number"
              value={form.birth_year}
              onChange={(e) => set("birth_year", e.target.value)}
              placeholder="z.B. 1995"
              className={inputClass}
            />
          </Field>
        </div>
      </Group>

      {/* Kontakt */}
      <Group title="Kontakt">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="E-Mail">
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Telefon">
            <input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      </Group>

      {/* Region */}
      <Group title="Region">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Stadt">
            <input
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Kanton">
            <input
              value={form.canton}
              onChange={(e) => set("canton", e.target.value)}
              placeholder="z.B. ZH"
              className={inputClass}
            />
          </Field>
          <Field label="Land">
            <input
              value={form.country}
              onChange={(e) => set("country", e.target.value)}
              className={inputClass}
            />
          </Field>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={form.travel_available}
                onChange={(e) => set("travel_available", e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
              />
              Reisebereit
            </label>
          </div>
        </div>
      </Group>

      {/* Social */}
      <Group title="Social Media">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Instagram-Handle">
            <input
              value={form.instagram_handle}
              onChange={(e) => set("instagram_handle", e.target.value)}
              placeholder="@handle"
              className={inputClass}
            />
          </Field>
          <Field label="Instagram-Follower">
            <input
              type="number"
              value={form.instagram_followers}
              onChange={(e) => set("instagram_followers", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="TikTok-Handle">
            <input
              value={form.tiktok_handle}
              onChange={(e) => set("tiktok_handle", e.target.value)}
              placeholder="@handle"
              className={inputClass}
            />
          </Field>
          <Field label="TikTok-Follower">
            <input
              type="number"
              value={form.tiktok_followers}
              onChange={(e) => set("tiktok_followers", e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      </Group>

      {/* Profil */}
      <Group title="Profil">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-neutral-700">
              Creator-Typen
            </span>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {CREATOR_TYPES.map((t) => (
                <label
                  key={t.key}
                  className="flex items-center gap-2 text-sm text-neutral-700"
                >
                  <input
                    type="checkbox"
                    checked={creatorTypes.includes(t.key)}
                    onChange={() =>
                      toggle(creatorTypes, setCreatorTypes, t.key)
                    }
                    className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
                  />
                  {t.label}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-neutral-700">
              Sprachen
            </span>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {CREATOR_LANGUAGES.map((l) => (
                <label
                  key={l.key}
                  className="flex items-center gap-2 text-sm text-neutral-700"
                >
                  <input
                    type="checkbox"
                    checked={languages.includes(l.key)}
                    onChange={() => toggle(languages, setLanguages, l.key)}
                    className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
                  />
                  {l.label}
                </label>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Erfahrung">
              <select
                value={form.experience_level}
                onChange={(e) => set("experience_level", e.target.value)}
                className={inputClass}
              >
                <option value="">- keine Angabe -</option>
                {EXPERIENCE_LEVELS.map((x) => (
                  <option key={x.key} value={x.key}>
                    {x.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      </Group>

      {/* Preise */}
      <Group title="Preise (CHF)">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Stundensatz">
            <input
              type="number"
              step="0.01"
              value={form.hourly_rate}
              onChange={(e) => set("hourly_rate", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Halbtagessatz">
            <input
              type="number"
              step="0.01"
              value={form.half_day_rate}
              onChange={(e) => set("half_day_rate", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Tagessatz">
            <input
              type="number"
              step="0.01"
              value={form.full_day_rate}
              onChange={(e) => set("full_day_rate", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Reisekosten">
            <input
              type="number"
              step="0.01"
              value={form.travel_costs}
              onChange={(e) => set("travel_costs", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Zusatzkosten">
            <input
              type="number"
              step="0.01"
              value={form.additional_costs}
              onChange={(e) => set("additional_costs", e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      </Group>

      {/* CRM */}
      <Group title="CRM">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value as typeof form.status)}
              className={inputClass}
            >
              {CREATOR_STATUSES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Score (0-100)">
            <input
              type="number"
              min={0}
              max={100}
              value={form.score}
              onChange={(e) => set("score", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Gruppen-Status">
            <select
              value={form.creator_group_status}
              onChange={(e) => set("creator_group_status", e.target.value)}
              className={inputClass}
            >
              {CREATOR_GROUP_STATUSES.map((g) => (
                <option key={g.key} value={g.key}>
                  {g.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tags (Komma-getrennt)">
            <input
              value={form.tags}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="Zuerich, UGC, Beauty"
              className={inputClass}
            />
          </Field>
        </div>
      </Group>

      {/* Datenschutz */}
      <Group title="Datenschutz (DSG)">
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={form.consent_given}
              onChange={(e) => set("consent_given", e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
            />
            Einwilligung erteilt
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Datum der Einwilligung">
              <input
                type="date"
                value={form.consent_date}
                onChange={(e) => set("consent_date", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Notiz zur Einwilligung">
              <input
                value={form.consent_note}
                onChange={(e) => set("consent_note", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </div>
      </Group>

      {/* Notizen */}
      <Group title="Notizen">
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          className={inputClass}
        />
      </Group>

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Abbrechen
          </Button>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Speichern ...
            </>
          ) : mode === "create" ? (
            "Creator erstellen"
          ) : (
            "Speichern"
          )}
        </Button>
      </div>
    </form>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-neutral-700">
        {label}
      </label>
      {children}
    </div>
  );
}
