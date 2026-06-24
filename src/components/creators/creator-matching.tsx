"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Sparkles, MapPin, Coins, Send, Star } from "lucide-react";
import {
  CREATOR_TYPES,
  EXPERIENCE_LEVELS,
  CREATOR_LANGUAGES,
} from "@/config/catalog";
import {
  matchCreatorsAction,
  createAssignmentAction,
} from "@/app/(app)/production/creators/actions";
import { StarRating } from "@/components/creators/star-rating";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, formatCHF } from "@/lib/utils";
import type { CreatorMatch, MatchCriteria } from "@/types/entities";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

type ShootOption = { id: string; title: string; shooting_date: string | null };

interface FormState {
  shootId: string;
  canton: string;
  city: string;
  creatorType: string;
  experienceLevel: string;
  language: string;
  maxBudgetChf: string;
  date: string;
  minScore: string;
}

const EMPTY_FORM: FormState = {
  shootId: "",
  canton: "",
  city: "",
  creatorType: "",
  experienceLevel: "",
  language: "",
  maxBudgetChf: "",
  date: "",
  minScore: "",
};

function barTone(score: number): { bar: string; text: string } {
  if (score >= 70) return { bar: "bg-green-500", text: "text-green-700" };
  if (score >= 40) return { bar: "bg-amber-500", text: "text-amber-600" };
  return { bar: "bg-red-500", text: "text-red-600" };
}

export function CreatorMatching({ shoots }: { shoots: ShootOption[] }) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [matches, setMatches] = useState<CreatorMatch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Anfragen-Zustand je Creator (Pending / erledigt).
  const [requesting, setRequesting] = useState<Record<string, boolean>>({});
  const [requested, setRequested] = useState<Record<string, boolean>>({});

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function buildCriteria(): MatchCriteria {
    const criteria: MatchCriteria = {};
    if (form.canton.trim()) criteria.canton = form.canton.trim();
    if (form.city.trim()) criteria.city = form.city.trim();
    if (form.creatorType) criteria.creatorType = form.creatorType;
    if (form.experienceLevel) criteria.experienceLevel = form.experienceLevel;
    if (form.language) criteria.language = form.language;
    if (form.maxBudgetChf.trim()) {
      criteria.maxBudget = Math.round(Number(form.maxBudgetChf) * 100);
    }
    if (form.date) criteria.date = form.date;
    if (form.minScore.trim()) criteria.minScore = Number(form.minScore);
    return criteria;
  }

  function runMatch() {
    setError(null);
    const criteria = buildCriteria();
    startTransition(async () => {
      const res = await matchCreatorsAction(criteria);
      if (res.ok) {
        setMatches(res.data ?? []);
        setRequested({});
      } else {
        setError(res.error);
        setMatches([]);
      }
    });
  }

  function requestCreator(match: CreatorMatch) {
    if (!form.shootId) return;
    const creatorId = match.creator.id;
    setRequesting((prev) => ({ ...prev, [creatorId]: true }));
    startTransition(async () => {
      const res = await createAssignmentAction({
        shoot_id: form.shootId,
        creator_id: creatorId,
        agreed_rate: match.creator.full_day_rate ?? undefined,
      });
      setRequesting((prev) => ({ ...prev, [creatorId]: false }));
      if (res.ok) {
        setRequested((prev) => ({ ...prev, [creatorId]: true }));
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Kriterien-Formular */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Fuer Shooting">
            <select
              className={inputClass}
              value={form.shootId}
              onChange={(e) => update("shootId", e.target.value)}
            >
              <option value="">Kein Shooting (nur suchen)</option>
              {shoots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                  {s.shooting_date ? ` (${s.shooting_date})` : ""}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Kanton">
            <input
              className={inputClass}
              value={form.canton}
              onChange={(e) => update("canton", e.target.value)}
              placeholder="z.B. ZH"
            />
          </Field>

          <Field label="Stadt">
            <input
              className={inputClass}
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              placeholder="z.B. Zuerich"
            />
          </Field>

          <Field label="Creator-Typ">
            <select
              className={inputClass}
              value={form.creatorType}
              onChange={(e) => update("creatorType", e.target.value)}
            >
              <option value="">Alle Typen</option>
              {CREATOR_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Erfahrung">
            <select
              className={inputClass}
              value={form.experienceLevel}
              onChange={(e) => update("experienceLevel", e.target.value)}
            >
              <option value="">Alle Stufen</option>
              {EXPERIENCE_LEVELS.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Sprache">
            <select
              className={inputClass}
              value={form.language}
              onChange={(e) => update("language", e.target.value)}
            >
              <option value="">Alle Sprachen</option>
              {CREATOR_LANGUAGES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Max. Budget (CHF)">
            <input
              type="number"
              min={0}
              step={10}
              className={inputClass}
              value={form.maxBudgetChf}
              onChange={(e) => update("maxBudgetChf", e.target.value)}
              placeholder="z.B. 800"
            />
          </Field>

          <Field label="Datum">
            <input
              type="date"
              className={inputClass}
              value={form.date}
              onChange={(e) => update("date", e.target.value)}
            />
          </Field>

          <Field label="Min. Score">
            <input
              type="number"
              min={0}
              max={100}
              className={inputClass}
              value={form.minScore}
              onChange={(e) => update("minScore", e.target.value)}
              placeholder="0-100"
            />
          </Field>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <Button onClick={runMatch} disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            )}
            Passende Creator finden
          </Button>
          {matches !== null && !isPending ? (
            <span className="text-sm text-neutral-500">
              {matches.length} Treffer
            </span>
          ) : null}
        </div>

        {error ? (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        ) : null}
      </div>

      {/* Ergebnisse */}
      <ResultsList
        matches={matches}
        isPending={isPending}
        hasShoot={Boolean(form.shootId)}
        requesting={requesting}
        requested={requested}
        onRequest={requestCreator}
      />
    </div>
  );
}

function ResultsList({
  matches,
  isPending,
  hasShoot,
  requesting,
  requested,
  onRequest,
}: {
  matches: CreatorMatch[] | null;
  isPending: boolean;
  hasShoot: boolean;
  requesting: Record<string, boolean>;
  requested: Record<string, boolean>;
  onRequest: (m: CreatorMatch) => void;
}) {
  if (isPending) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white py-12 text-sm text-neutral-500 shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Suche laeuft ...
      </div>
    );
  }

  if (matches === null) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Noch keine Suche gestartet"
        description="Lege Kriterien fest und starte das Matching, um passende Creator zu finden."
      />
    );
  }

  if (matches.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Keine passenden Creator gefunden"
        description="Passe die Kriterien an (z.B. Budget oder Score senken) und versuche es erneut."
      />
    );
  }

  // Sortiert nach matchScore absteigend (defensiv).
  const sorted = [...matches].sort((a, b) => b.matchScore - a.matchScore);

  return (
    <div className="space-y-3">
      {sorted.map((m) => (
        <MatchRow
          key={m.creator.id}
          match={m}
          hasShoot={hasShoot}
          requesting={Boolean(requesting[m.creator.id])}
          requested={Boolean(requested[m.creator.id])}
          onRequest={onRequest}
        />
      ))}
    </div>
  );
}

function MatchRow({
  match,
  hasShoot,
  requesting,
  requested,
  onRequest,
}: {
  match: CreatorMatch;
  hasShoot: boolean;
  requesting: boolean;
  requested: boolean;
  onRequest: (m: CreatorMatch) => void;
}) {
  const { creator, matchScore, breakdown } = match;
  const tone = barTone(matchScore);
  const score = Math.max(0, Math.min(100, Math.round(matchScore)));
  const region = [creator.city, creator.canton].filter(Boolean).join(", ");
  const name = [creator.first_name, creator.last_name]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-colors hover:border-brand-200">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Linke Spalte: Name + Meta + Breakdown */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <Link
              href={`/production/creators/${creator.id}`}
              className="truncate text-sm font-semibold text-neutral-900 hover:text-brand-700"
            >
              {name || "Unbenannt"}
            </Link>
            {creator.rating_avg != null ? (
              <span className="inline-flex items-center gap-1">
                <StarRating value={creator.rating_avg} size={14} />
              </span>
            ) : null}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
            {region ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {region}
              </span>
            ) : null}
            {creator.full_day_rate != null ? (
              <span className="inline-flex items-center gap-1">
                <Coins className="h-3.5 w-3.5" aria-hidden="true" />
                {formatCHF(creator.full_day_rate)} / Tag
              </span>
            ) : null}
            {creator.rating_avg != null ? (
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5" aria-hidden="true" />
                {creator.rating_avg.toFixed(1)}
                <span className="text-neutral-400">
                  ({creator.rating_count})
                </span>
              </span>
            ) : null}
          </div>

          {/* Breakdown-Chips */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Object.entries(breakdown).map(([key, value]) => (
              <span
                key={key}
                className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] font-medium text-neutral-600"
              >
                {BREAKDOWN_LABELS[key] ?? key}
                <span className="text-neutral-400">{Math.round(value)}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Rechte Spalte: Score + Fortschrittsbalken + Anfragen */}
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:w-44">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-medium text-neutral-500">
              Match-Score
            </span>
            <span className={cn("text-2xl font-bold leading-none", tone.text)}>
              {score}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
            <div
              className={cn("h-full rounded-full transition-all", tone.bar)}
              style={{ width: `${score}%` }}
            />
          </div>

          {requested ? (
            <span className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700">
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              Angefragt
            </span>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              className="mt-1 w-full"
              disabled={!hasShoot || requesting}
              title={
                hasShoot
                  ? undefined
                  : "Bitte zuerst ein Shooting auswaehlen"
              }
              onClick={() => onRequest(match)}
            >
              {requesting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              Anfragen
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

const BREAKDOWN_LABELS: Record<string, string> = {
  type: "Typ",
  region: "Region",
  price: "Preis",
  availability: "Verfuegbarkeit",
  score: "Score",
  experience: "Erfahrung",
  language: "Sprache",
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-neutral-600">
        {label}
      </span>
      {children}
    </label>
  );
}
