"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import {
  outreachFormOptionsAction,
  generateDraftAction,
} from "@/app/(app)/sales/outreach/actions";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

type Options = {
  leads: { id: string; company_name: string }[];
  campaigns: { id: string; name: string }[];
  templates: { id: string; name: string }[];
};

/**
 * "Personalisierte E-Mail erstellen"-Button mit Modal. Laedt beim Oeffnen die
 * Optionen (Leads/Templates/Kampagnen) und generiert per generateDraftAction
 * einen Entwurf. Es wird NICHT versendet — der Entwurf muss vor dem Versand
 * manuell geprueft werden.
 */
export function GenerateDraft({
  label = "Personalisierte E-Mail erstellen",
}: {
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<Options | null>(null);
  const [leadId, setLeadId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (open && !options) {
      outreachFormOptionsAction().then((r) =>
        setOptions(
          r.ok && r.data
            ? r.data
            : { leads: [], campaigns: [], templates: [] },
        ),
      );
    }
  }, [open, options]);

  function reset() {
    setLeadId("");
    setTemplateId("");
    setCampaignId("");
    setError(null);
    setDone(false);
  }

  function close() {
    setOpen(false);
    reset();
  }

  function submit() {
    if (!leadId) {
      setError("Bitte einen Lead auswaehlen.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await generateDraftAction(
        leadId,
        templateId || undefined,
        campaignId || undefined,
      );
      if (result.ok) {
        setDone(true);
        router.refresh();
      } else {
        setError(result.error ?? "Entwurf konnte nicht erstellt werden.");
      }
    });
  }

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        {label}
      </Button>

      <Modal
        open={open}
        onClose={close}
        title="Personalisierte E-Mail erstellen"
        size="md"
      >
        {!options ? (
          <div className="flex items-center justify-center py-10 text-neutral-400">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          </div>
        ) : done ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Entwurf erstellt — vor Versand pruefen.</span>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={reset}>
                Weiteren Entwurf
              </Button>
              <Button variant="primary" onClick={close}>
                Fertig
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Lead <span className="text-red-500">*</span>
              </label>
              <select
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
                className={inputClass}
                disabled={pending}
              >
                <option value="">Lead auswaehlen …</option>
                {options.leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.company_name}
                  </option>
                ))}
              </select>
              {options.leads.length === 0 ? (
                <p className="mt-1 text-xs text-neutral-400">
                  Keine Leads vorhanden.
                </p>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Vorlage <span className="text-neutral-400">(optional)</span>
              </label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className={inputClass}
                disabled={pending}
              >
                <option value="">Ohne Vorlage</option>
                {options.templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Kampagne <span className="text-neutral-400">(optional)</span>
              </label>
              <select
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                className={inputClass}
                disabled={pending}
              >
                <option value="">Keine Kampagne</option>
                {options.campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {error ? (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            ) : null}

            <p className="text-xs text-neutral-400">
              Es wird ein Entwurf erstellt — kein automatischer Versand. Pruefe
              die E-Mail vor dem Senden.
            </p>

            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={close} disabled={pending}>
                Abbrechen
              </Button>
              <Button variant="primary" onClick={submit} disabled={pending}>
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                )}
                Entwurf generieren
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
