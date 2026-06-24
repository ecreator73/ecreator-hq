"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateProposalAction } from "@/app/(app)/sales/proposals/actions";
import type { ProposalUpdateInput } from "@/lib/validation/proposals";
import type { ProposalWithRelations } from "@/types/entities";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

/** Rappen -> CHF-String fuer das Eingabefeld (leer wenn null). */
function rappenToChf(rappen: number | null | undefined): string {
  if (rappen == null) return "";
  return String(rappen / 100);
}

/** CHF-Eingabe -> Rappen (ganzzahlig). Leere Eingabe -> undefined. */
function chfToRappen(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const num = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(num)) return undefined;
  return Math.round(num * 100);
}

export function ProposalForm({
  proposal,
  onDone,
  onCancel,
}: {
  proposal: ProposalWithRelations;
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState({
    title: proposal.title ?? "",
    situation: proposal.situation ?? "",
    goal: proposal.goal ?? "",
    solution: proposal.solution ?? "",
    next_steps: proposal.next_steps ?? "",
    setup_fee: rappenToChf(proposal.setup_fee),
    contract_duration_months:
      proposal.contract_duration_months != null
        ? String(proposal.contract_duration_months)
        : "",
    contract_start_date: proposal.contract_start_date ?? "",
    payment_terms: proposal.payment_terms ?? "",
    cancellation_terms: proposal.cancellation_terms ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    setError(null);
    if (!form.title.trim()) {
      setError("Bitte einen Titel eingeben.");
      return;
    }
    const durationNum = form.contract_duration_months.trim();
    const input: ProposalUpdateInput = {
      title: form.title.trim(),
      situation: form.situation.trim() || undefined,
      goal: form.goal.trim() || undefined,
      solution: form.solution.trim() || undefined,
      next_steps: form.next_steps.trim() || undefined,
      setup_fee: chfToRappen(form.setup_fee),
      contract_duration_months:
        durationNum === "" ? undefined : Number(durationNum),
      contract_start_date: form.contract_start_date || undefined,
      payment_terms: form.payment_terms.trim() || undefined,
      cancellation_terms: form.cancellation_terms.trim() || undefined,
    };

    startTransition(async () => {
      const result = await updateProposalAction(proposal.id, input);
      if (result.ok) onDone?.();
      else setError(result.error);
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-5"
    >
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-neutral-700">
          Titel *
        </label>
        <input
          autoFocus
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Inhalt / Narrativ */}
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Inhalt
        </p>
        <Field label="Ausgangslage">
          <textarea
            value={form.situation}
            onChange={(e) => set("situation", e.target.value)}
            rows={3}
            className={inputClass}
            placeholder="Wo steht der Kunde heute?"
          />
        </Field>
        <Field label="Ziel">
          <textarea
            value={form.goal}
            onChange={(e) => set("goal", e.target.value)}
            rows={3}
            className={inputClass}
            placeholder="Was soll erreicht werden?"
          />
        </Field>
        <Field label="Loesung">
          <textarea
            value={form.solution}
            onChange={(e) => set("solution", e.target.value)}
            rows={3}
            className={inputClass}
            placeholder="Wie loesen wir das?"
          />
        </Field>
        <Field label="Naechste Schritte">
          <textarea
            value={form.next_steps}
            onChange={(e) => set("next_steps", e.target.value)}
            rows={3}
            className={inputClass}
            placeholder="Wie geht es nach der Zusage weiter?"
          />
        </Field>
      </div>

      {/* Vertrag / Konditionen */}
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Vertrag &amp; Konditionen
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Setup-Gebuehr (CHF)">
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.setup_fee}
              onChange={(e) => set("setup_fee", e.target.value)}
              className={inputClass}
              placeholder="0.00"
            />
          </Field>
          <Field label="Laufzeit (Monate)">
            <input
              type="number"
              min={0}
              step={1}
              value={form.contract_duration_months}
              onChange={(e) =>
                set("contract_duration_months", e.target.value)
              }
              className={inputClass}
            />
          </Field>
          <Field label="Vertragsstart">
            <input
              type="date"
              value={form.contract_start_date}
              onChange={(e) => set("contract_start_date", e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Zahlungsbedingungen">
          <textarea
            value={form.payment_terms}
            onChange={(e) => set("payment_terms", e.target.value)}
            rows={2}
            className={inputClass}
            placeholder="z. B. Zahlbar 14 Tage netto nach Rechnungsstellung."
          />
        </Field>
        <Field label="Kuendigungsbedingungen">
          <textarea
            value={form.cancellation_terms}
            onChange={(e) => set("cancellation_terms", e.target.value)}
            rows={2}
            className={inputClass}
            placeholder="z. B. Kuendigung mit 30 Tagen Frist zum Laufzeitende."
          />
        </Field>
      </div>

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
          ) : (
            "Speichern"
          )}
        </Button>
      </div>
    </form>
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
