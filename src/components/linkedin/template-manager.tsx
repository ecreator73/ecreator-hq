"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Info,
  Loader2,
  Pencil,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { LINKEDIN_TEMPLATE_CATEGORIES } from "@/config/catalog";
import {
  createLinkedinTemplateAction,
  updateLinkedinTemplateAction,
} from "@/app/(app)/sales/linkedin/actions";
import type { LinkedInMessageTemplate } from "@/types/entities";
import type { LinkedInTemplateCreateInput } from "@/lib/validation/linkedin";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

/** Platzhalter, die beim Personalisieren pro Prospect ersetzt werden. */
const TEMPLATE_VARIABLES = [
  "vorname",
  "name",
  "firma",
  "position",
  "branche",
  "standort",
  "website",
] as const;

export function TemplateManager({
  templates,
}: {
  templates: LinkedInMessageTemplate[];
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editFor, setEditFor] = useState<LinkedInMessageTemplate | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function reset() {
    setError(null);
    setSuccess(null);
  }

  function toggleActive(t: LinkedInMessageTemplate) {
    reset();
    start(async () => {
      const r = await updateLinkedinTemplateAction(t.id, { active: !t.active });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSuccess(t.active ? "Vorlage deaktiviert." : "Vorlage aktiviert.");
      router.refresh();
    });
  }

  // Nach Kategorie gruppieren (Reihenfolge aus dem Katalog).
  const knownKeys = new Set<string>(
    LINKEDIN_TEMPLATE_CATEGORIES.map((c) => c.key),
  );
  const groups: Array<{
    key: string;
    label: string;
    items: LinkedInMessageTemplate[];
  }> = LINKEDIN_TEMPLATE_CATEGORIES.map((c) => ({
    key: c.key as string,
    label: c.label as string,
    items: templates.filter((t) => t.category === c.key),
  })).filter((g) => g.items.length > 0);
  const other = templates.filter((t) => !knownKeys.has(t.category));
  if (other.length > 0) {
    groups.push({ key: "sonstige", label: "Sonstige", items: other });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-700">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          Vorlagen werden pro Prospect personalisiert - Versand erfolgt IMMER
          manuell ueber LinkedIn.
        </span>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-neutral-500">
          {templates.length} Vorlage{templates.length === 1 ? "" : "n"}
        </p>
        <Button
          onClick={() => {
            reset();
            setCreateOpen(true);
          }}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Vorlage
        </Button>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}
      {success ? (
        <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{success}</span>
        </div>
      ) : null}

      {templates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Noch keine Vorlagen"
          description="Lege wiederverwendbare Nachrichten-Vorlagen mit Platzhaltern wie {{vorname}} oder {{firma}} an - z. B. fuer Kontaktanfragen oder Follow-ups."
          action={
            <Button
              onClick={() => {
                reset();
                setCreateOpen(true);
              }}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Vorlage
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.key} className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {g.label} ({g.items.length})
              </h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {g.items.map((t) => (
                  <Card key={t.id} className="flex flex-col p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-neutral-900">
                        {t.name}
                      </span>
                      {t.active ? (
                        <Badge tone="green">Aktiv</Badge>
                      ) : (
                        <Badge tone="neutral">Inaktiv</Badge>
                      )}
                    </div>
                    {t.body ? (
                      <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm text-neutral-600">
                        {t.body}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm italic text-neutral-400">
                        Kein Text hinterlegt.
                      </p>
                    )}
                    {t.variables.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {t.variables.map((v) => (
                          <Badge key={v} tone="brand">
                            {`{{${v}}}`}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-4 flex items-center gap-1.5 border-t border-neutral-100 pt-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          reset();
                          setEditFor(t);
                        }}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        Bearbeiten
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(t)}
                        disabled={pending}
                      >
                        {t.active ? "Deaktivieren" : "Aktivieren"}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {createOpen ? (
        <TemplateFormModal
          mode="create"
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            setSuccess("Vorlage erstellt.");
            router.refresh();
          }}
        />
      ) : null}
      {editFor ? (
        <TemplateFormModal
          mode="edit"
          template={editFor}
          onClose={() => setEditFor(null)}
          onSaved={() => {
            setEditFor(null);
            setSuccess("Vorlage aktualisiert.");
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function TemplateFormModal({
  mode,
  template,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  template?: LinkedInMessageTemplate;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: template?.name ?? "",
    category: (template?.category ??
      LINKEDIN_TEMPLATE_CATEGORIES[0].key) as string,
    body: template?.body ?? "",
    active: template?.active ?? true,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    setError(null);
    if (!form.name.trim()) {
      setError("Bitte einen Vorlagen-Namen eingeben.");
      return;
    }
    const input: LinkedInTemplateCreateInput = {
      name: form.name.trim(),
      category: form.category as LinkedInTemplateCreateInput["category"],
      body: form.body || undefined,
      active: form.active,
    };
    start(async () => {
      const r =
        mode === "create"
          ? await createLinkedinTemplateAction(input)
          : await updateLinkedinTemplateAction(
              (template as LinkedInMessageTemplate).id,
              input,
            );
      if (!r.ok) {
        setError(r.error);
        return;
      }
      onSaved();
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === "create" ? "Vorlage anlegen" : `Vorlage bearbeiten — ${template?.name ?? ""}`}
      size="lg"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700">
              Name *
            </label>
            <input
              autoFocus
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="z. B. Kontaktanfrage Broker"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700">
              Kategorie
            </label>
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className={inputClass}
            >
              {LINKEDIN_TEMPLATE_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-neutral-700">
            Text
          </label>
          <textarea
            value={form.body}
            onChange={(e) => set("body", e.target.value)}
            rows={8}
            placeholder={"Hallo {{vorname}},\n\nmir ist aufgefallen, dass {{firma}} ..."}
            className={`${inputClass} font-mono`}
          />
          <p className="text-xs text-neutral-400">
            Verfuegbare Variablen:{" "}
            {TEMPLATE_VARIABLES.map((v, i) => (
              <span key={v}>
                {i > 0 ? ", " : null}
                <code className="rounded bg-neutral-100 px-1 py-0.5">
                  {`{{${v}}}`}
                </code>
              </span>
            ))}{" "}
            — sie werden beim Personalisieren pro Prospect ersetzt.
          </p>
        </div>

        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => set("active", e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
          />
          Aktiv
        </label>

        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            {mode === "create" ? "Vorlage erstellen" : "Speichern"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
