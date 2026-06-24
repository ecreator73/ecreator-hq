"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ALERT_CATEGORIES, ALERT_SEVERITIES } from "@/config/catalog";
import { createExecutiveAlertAction } from "@/app/(app)/executive/actions";
import type { ExecutiveAlertCreateInput } from "@/lib/validation/executive";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

/** "+ Alert"-Button mit Modal zum Anlegen eines manuellen Executive-Alerts. */
export function AlertQuickCreate({ label = "Alert" }: { label?: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    category: "",
    severity: "",
    description: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function reset() {
    setForm({ title: "", category: "", severity: "", description: "" });
    setError(null);
  }

  function submit() {
    setError(null);
    if (!form.title.trim()) {
      setError("Bitte einen Titel eingeben.");
      return;
    }
    const input: ExecutiveAlertCreateInput = {
      title: form.title.trim(),
      category: (form.category || undefined) as ExecutiveAlertCreateInput["category"],
      severity: (form.severity || undefined) as ExecutiveAlertCreateInput["severity"],
      description: form.description.trim() || undefined,
    };

    startTransition(async () => {
      const result = await createExecutiveAlertAction(input);
      if (result.ok) {
        setOpen(false);
        reset();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50"
      >
        <Plus className="h-4 w-4" />
        {label}
      </button>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title="Neuer Alert"
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700">Titel *</label>
            <input
              autoFocus
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-neutral-700">Kategorie</label>
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className={inputClass}
              >
                <option value="">- keine Angabe -</option>
                {ALERT_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-neutral-700">Dringlichkeit</label>
              <select
                value={form.severity}
                onChange={(e) => set("severity", e.target.value)}
                className={inputClass}
              >
                <option value="">- keine Angabe -</option>
                {ALERT_SEVERITIES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700">Beschreibung</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              className={inputClass}
            />
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
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setOpen(false);
                reset();
              }}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Speichern ...
                </>
              ) : (
                "Alert erstellen"
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
