"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StarRating, StarInput } from "@/components/creators/star-rating";
import { formatDate } from "@/lib/utils";
import { RATING_CRITERIA, RATING_CRITERIA_LABELS } from "@/config/catalog";
import type { CreatorRating } from "@/types/entities";
import {
  createRatingAction,
  deleteRatingAction,
} from "@/app/(app)/production/creators/actions";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

type CriterionKey =
  | "punctuality"
  | "appearance"
  | "camera_quality"
  | "communication"
  | "professionalism";

const EMPTY: Record<CriterionKey, number> = {
  punctuality: 0,
  appearance: 0,
  camera_quality: 0,
  communication: 0,
  professionalism: 0,
};

function averageOverall(items: CreatorRating[]): number | null {
  const values = items
    .map((r) => r.overall)
    .filter((v): v is number => v != null);
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Bewertungen eines Creators: Durchschnitt oben, Liste je Bewertung mit
 * Kriterien-Aufschluesselung und Loeschen, plus Formular fuer neue Bewertung
 * (Sterne je Kriterium, optionaler Shoot-Bezug, Kommentar).
 */
export function RatingPanel({
  creatorId,
  items,
  shoots,
}: {
  creatorId: string;
  items: CreatorRating[];
  shoots: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [stars, setStars] = useState<Record<CriterionKey, number>>(EMPTY);
  const [shootId, setShootId] = useState("");
  const [comment, setComment] = useState("");

  const avg = averageOverall(items);

  function setCriterion(key: CriterionKey, value: number) {
    setStars((prev) => ({ ...prev, [key]: value }));
  }

  function toUndef(n: number): number | undefined {
    return n > 0 ? n : undefined;
  }

  function submit() {
    const hasAny = RATING_CRITERIA.some(
      (c) => stars[c.key as CriterionKey] > 0,
    );
    if (!hasAny) {
      setError("Bitte mindestens ein Kriterium bewerten.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createRatingAction({
        creator_id: creatorId,
        shoot_id: shootId || undefined,
        punctuality: toUndef(stars.punctuality),
        appearance: toUndef(stars.appearance),
        camera_quality: toUndef(stars.camera_quality),
        communication: toUndef(stars.communication),
        professionalism: toUndef(stars.professionalism),
        comment: comment.trim() || undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setStars(EMPTY);
      setShootId("");
      setComment("");
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await deleteRatingAction(id, creatorId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {avg != null ? (
        <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3">
          <span className="text-sm font-medium text-neutral-600">
            Durchschnitt
          </span>
          <StarRating value={avg} />
          <span className="text-sm font-semibold text-neutral-900">
            {avg.toFixed(1)}
          </span>
          <span className="text-xs text-neutral-400">
            ({items.length} {items.length === 1 ? "Bewertung" : "Bewertungen"})
          </span>
        </div>
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          icon={Star}
          title="Noch keine Bewertungen"
          description="Bewerte diesen Creator nach einem Shooting anhand der Kriterien unten."
        />
      ) : (
        <ul className="space-y-3">
          {items.map((r) => (
            <li
              key={r.id}
              className="rounded-lg border border-neutral-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <StarRating value={r.overall} />
                  {r.overall != null ? (
                    <span className="text-sm font-semibold text-neutral-900">
                      {r.overall.toFixed(1)}
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => remove(r.id)}
                  disabled={pending}
                  className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  aria-label="Bewertung loeschen"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-neutral-500">
                {RATING_CRITERIA.map((c) => {
                  const v = r[c.key as CriterionKey];
                  if (v == null) return null;
                  return (
                    <span
                      key={c.key}
                      className="inline-flex items-center gap-1"
                    >
                      <span>{RATING_CRITERIA_LABELS[c.key]}</span>
                      <span className="font-medium text-neutral-700">
                        {v}/5
                      </span>
                    </span>
                  );
                })}
              </div>

              {r.comment ? (
                <p className="mt-3 text-sm text-neutral-700">{r.comment}</p>
              ) : null}

              <div className="mt-2 flex items-center gap-2 text-xs text-neutral-400">
                {r.author?.full_name ? <span>{r.author.full_name}</span> : null}
                {r.author?.full_name ? <span>·</span> : null}
                <span>{formatDate(r.created_at)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-4">
        <p className="mb-3 text-sm font-medium text-neutral-700">
          Neue Bewertung
        </p>
        <div className="space-y-2.5">
          {RATING_CRITERIA.map((c) => (
            <div
              key={c.key}
              className="flex items-center justify-between gap-3"
            >
              <span className="text-sm text-neutral-600">{c.label}</span>
              <StarInput
                value={stars[c.key as CriterionKey]}
                onChange={(n) => setCriterion(c.key as CriterionKey, n)}
              />
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3">
          {shoots.length > 0 ? (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-neutral-600">
                Shooting (optional)
              </span>
              <select
                value={shootId}
                onChange={(e) => setShootId(e.target.value)}
                className={inputClass}
              >
                <option value="">Kein Bezug</option>
                {shoots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-600">
              Kommentar
            </span>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Notizen zur Zusammenarbeit …"
              className={inputClass}
            />
          </label>
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <div className="mt-3 flex justify-end">
          <Button size="sm" onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Bewertung speichern
          </Button>
        </div>
      </div>
    </div>
  );
}
