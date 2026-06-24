"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Plus, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { createSequenceAction } from "@/app/(app)/sales/outreach/actions";
import type { FollowUpSequenceCreateInput } from "@/lib/validation/outreach";
import { cn } from "@/lib/utils";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

const STANDARD_SEQUENCE: FollowUpSequenceCreateInput = {
  name: "Standard",
  steps: [
    { day: 0, label: "Erstkontakt" },
    { day: 3, label: "Follow-Up 1" },
    { day: 7, label: "Follow-Up 2" },
    { day: 14, label: "Letzter Follow-Up" },
  ],
};

/**
 * "+ Sequenz"-Button mit Modal (Name, Beschreibung) sowie ein Direkt-Button
 * "Standard-Sequenz", der eine 4-stufige Default-Sequenz anlegt.
 */
export function SequenceQuickCreate({ label = "Sequenz" }: { label?: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function reset() {
    setForm({ name: "", description: "" });
    setError(null);
  }

  function run(input: FollowUpSequenceCreateInput, closeModal = false) {
    setError(null);
    startTransition(async () => {
      const result = await createSequenceAction(input);
      if (result.ok) {
        if (closeModal) {
          setOpen(false);
          reset();
        }
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function submit() {
    if (!form.name.trim()) {
      setError("Bitte einen Sequenz-Namen eingeben.");
      return;
    }
    run(
      {
        name: form.name.trim(),
        description: form.description || undefined,
      },
      true,
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        onClick={() => run(STANDARD_SEQUENCE)}
        disabled={pending}
      >
        <Sparkles className="h-4 w-4" />
        Standard-Sequenz
      </Button>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700",
        )}
      >
        <Plus className="h-4 w-4" />
        {label}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Neue Sequenz" size="md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700">
              Name *
            </label>
            <input
              autoFocus
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="z. B. Cold-Outreach 4 Schritte"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700">
              Beschreibung
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              placeholder="Wofuer wird diese Sequenz eingesetzt?"
              className={inputClass}
            />
          </div>

          <p className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
            Schritte koennen nach dem Anlegen ergaenzt werden. Fuer einen
            schnellen Start nutze den Button{" "}
            <span className="font-medium text-neutral-700">Standard-Sequenz</span>.
          </p>

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
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Speichern ...
                </>
              ) : (
                "Sequenz erstellen"
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
