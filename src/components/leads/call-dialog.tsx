"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Phone } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { CALL_OUTCOMES, NEXT_ACTIONS, OUTCOME_BY_KEY, addWorkdays, zurichTodayIso } from "@/lib/lead-workflow";
import { logCallAction } from "@/app/(app)/leads/actions";
import { LEAD_STATUSES } from "@/config/catalog";
import { cn } from "@/lib/utils";

export interface CallTarget {
  id: string;
  name: string;
  phone: string | null;
  noAnswers: number;
}

/** Anruf erfassen: Ergebnis waehlen -> Status, naechster Schritt und Datum werden vorgeschlagen. */
export function CallDialog({ lead, onClose }: { lead: CallTarget | null; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [outcome, setOutcome] = useState("no_answer");
  const [notes, setNotes] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [date, setDate] = useState("");
  const [minutes, setMinutes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const pick = (key: string) => {
    setOutcome(key);
    const o = OUTCOME_BY_KEY[key]!;
    setNextAction(o.nextAction);
    setDate(o.days == null ? "" : addWorkdays(zurichTodayIso(), o.days));
  };

  useEffect(() => {
    if (lead) {
      setNotes("");
      setMinutes("");
      setError(null);
      pick("no_answer");
    }
  }, [lead?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!lead) return null;
  const o = OUTCOME_BY_KEY[outcome]!;
  const willBe = outcome === "no_answer" && lead.noAnswers + 1 >= 3 ? "mehrfach_nicht_erreicht" : o.status;
  const statusLabel = LEAD_STATUSES.find((s) => s.key === willBe)?.label;

  const save = () =>
    start(async () => {
      setError(null);
      const r = await logCallAction({
        leadId: lead.id,
        outcome,
        notes,
        nextAction: nextAction || null,
        nextActionDate: date || null,
        durationMinutes: minutes ? Number(minutes) : null,
      });
      if (!r.ok) return setError(r.error);
      onClose();
      router.refresh();
    });

  return (
    <Modal
      open
      onClose={onClose}
      title={`Anruf · ${lead.name}`}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-neutral-500">{statusLabel ? <>Status wird: <span className="font-medium text-neutral-800">{statusLabel}</span></> : null}</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="h-9 rounded-lg border border-neutral-200 px-3 text-sm text-neutral-700 hover:bg-neutral-50">
              Abbrechen
            </button>
            <button type="button" onClick={save} disabled={pending} className="h-9 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
              {pending ? "Speichert…" : "Anruf speichern"}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {lead.phone ? (
          <a href={`tel:${lead.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100">
            <Phone className="h-4 w-4" aria-hidden /> {lead.phone} anrufen
          </a>
        ) : (
          <p className="text-xs text-neutral-500">Keine Telefonnummer hinterlegt.</p>
        )}
        <fieldset>
          <legend className="mb-2 text-xs font-medium text-neutral-600">Ergebnis</legend>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {CALL_OUTCOMES.map((x) => (
              <button
                key={x.key}
                type="button"
                aria-pressed={outcome === x.key}
                onClick={() => pick(x.key)}
                className={cn(
                  "rounded-lg border px-2.5 py-2 text-left text-sm transition-colors",
                  outcome === x.key ? "border-brand-600 bg-brand-600 text-white" : "border-neutral-200 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50",
                )}
              >
                {x.label}
              </button>
            ))}
          </div>
          {outcome === "no_answer" && lead.noAnswers > 0 ? (
            <p className="mt-2 text-xs text-neutral-500">Bisher {lead.noAnswers}× nicht erreicht.</p>
          ) : null}
        </fieldset>
        <label className="block text-xs font-medium text-neutral-600">
          Notiz
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={4000} placeholder="Was wurde besprochen?" className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm font-normal" />
        </label>
        <div className="grid gap-3 sm:grid-cols-[1fr_10rem_7rem]">
          <label className="block text-xs font-medium text-neutral-600">
            Nächster Schritt
            <select value={nextAction} onChange={(e) => setNextAction(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-neutral-200 bg-white px-2 text-sm font-normal">
              <option value="">Keiner (Lead abschliessen)</option>
              {Array.from(new Set([...NEXT_ACTIONS, nextAction].filter(Boolean))).map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-neutral-600">
            Datum
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-neutral-200 px-2 text-sm font-normal" />
          </label>
          <label className="block text-xs font-medium text-neutral-600">
            Dauer (Min.)
            <input type="number" min={0} max={600} value={minutes} onChange={(e) => setMinutes(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-neutral-200 px-2 text-sm font-normal" />
          </label>
        </div>
        {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{error}</p> : null}
      </div>
    </Modal>
  );
}
