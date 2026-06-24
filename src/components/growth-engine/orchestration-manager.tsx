"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { StatusSelect } from "@/components/production/status-select";
import { ORCHESTRATION_STATUSES } from "@/config/catalog";
import {
  createOrchestrationAction,
  setOrchestrationStatusAction,
  removeOrchestrationAction,
} from "@/app/(app)/operations/growth/actions";
import type { AutomationOrchestration } from "@/types/entities";

/**
 * Verwaltet die Orchestrierungs-Regeln (Trigger -> Aktion). Regeln sind
 * Vorschlags-Regeln: sie erzeugen Empfehlungen/Aufgaben, fuehren aber nie
 * ungefragt E-Mails/Vertraege/Rechnungen aus.
 */
export function OrchestrationManager({
  items,
}: {
  items: AutomationOrchestration[];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("");
  const [action, setAction] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function reset() {
    setName("");
    setTrigger("");
    setAction("");
    setDescription("");
    setError(null);
  }

  function onCreate() {
    if (!name.trim() || !trigger.trim() || !action.trim()) {
      setError("Name, Trigger und Aktion sind Pflichtfelder.");
      return;
    }
    startTransition(async () => {
      const res = await createOrchestrationAction({
        name,
        trigger,
        action,
        description,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      reset();
      setOpen(false);
      router.refresh();
    });
  }

  function onDelete(id: string) {
    startTransition(async () => {
      await removeOrchestrationAction(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Neue Regel
        </Button>
      </div>

      <ul className="space-y-2">
        {items.map((o) => (
          <li
            key={o.id}
            className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-neutral-900">{o.name}</p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                <span className="rounded bg-neutral-100 px-2 py-0.5 font-medium text-neutral-700">
                  {o.trigger}
                </span>
                <ArrowRight className="h-3 w-3 text-neutral-400" aria-hidden="true" />
                <span className="rounded bg-brand-50 px-2 py-0.5 font-medium text-brand-700">
                  {o.action}
                </span>
              </p>
              {o.description ? (
                <p className="mt-1 text-xs text-neutral-500">{o.description}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StatusSelect
                id={o.id}
                value={o.status}
                statuses={ORCHESTRATION_STATUSES}
                action={setOrchestrationStatusAction}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(o.id)}
                disabled={pending}
                aria-label="Regel loeschen"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title="Neue Orchestrierungs-Regel"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setOpen(false);
                reset();
              }}
            >
              Abbrechen
            </Button>
            <Button onClick={onCreate} disabled={pending}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              Speichern
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Field label="Name" value={name} onChange={setName} placeholder="z.B. Lead -> Audit" />
          <Field
            label="Trigger"
            value={trigger}
            onChange={setTrigger}
            placeholder="z.B. Lead erstellt"
          />
          <Field
            label="Aktion"
            value={action}
            onChange={setAction}
            placeholder="z.B. Website-Audit empfehlen"
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Beschreibung
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>
      </Modal>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-neutral-700">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
    </div>
  );
}
