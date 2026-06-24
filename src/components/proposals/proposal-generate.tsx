"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { PROPOSAL_TYPES } from "@/config/catalog";
import {
  generateProposalAction,
  proposalFormOptionsAction,
  type ProposalFormOptions,
} from "@/app/(app)/sales/proposals/actions";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";
const labelClass = "block text-xs font-medium text-neutral-600";

type Reference = "" | "lead" | "client";

/**
 * "Vorschlag generieren"-Button mit Modal. Erstellt ein neues Proposal aus
 * Typ + optionaler Lead-/Kunden-Zuordnung + Titel/Ziel und leitet zur Detailseite.
 */
export function ProposalGenerate({ label = "Vorschlag generieren" }: { label?: string }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ProposalFormOptions | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [proposalType, setProposalType] = useState<string>(PROPOSAL_TYPES[0]?.key ?? "");
  const [reference, setReference] = useState<Reference>("");
  const [leadId, setLeadId] = useState("");
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");

  const router = useRouter();

  useEffect(() => {
    if (open && !options) {
      proposalFormOptionsAction().then((r) =>
        setOptions(r.ok && r.data ? r.data : { leads: [], clients: [] }),
      );
    }
  }, [open, options]);

  function reset() {
    setProposalType(PROPOSAL_TYPES[0]?.key ?? "");
    setReference("");
    setLeadId("");
    setClientId("");
    setTitle("");
    setGoal("");
    setError(null);
  }

  async function submit() {
    setPending(true);
    setError(null);
    const res = await generateProposalAction({
      proposal_type: proposalType as Parameters<typeof generateProposalAction>[0]["proposal_type"],
      lead_id: reference === "lead" && leadId ? leadId : undefined,
      client_id: reference === "client" && clientId ? clientId : undefined,
      title: title.trim() || undefined,
      goal: goal.trim() || undefined,
    });
    setPending(false);
    if (res.ok && res.data) {
      setOpen(false);
      reset();
      router.push(`/sales/proposals/${res.data.id}`);
    } else if (!res.ok) {
      setError(res.error);
    }
  }

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)} className="gap-1.5">
        <Sparkles className="h-4 w-4" />
        {label}
      </Button>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title="Vorschlag generieren"
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setOpen(false);
                reset();
              }}
              disabled={pending}
            >
              Abbrechen
            </Button>
            <Button size="sm" onClick={submit} disabled={pending || !proposalType}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Generieren
            </Button>
          </>
        }
      >
        {options ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className={labelClass} htmlFor="gen-type">
                Angebotstyp
              </label>
              <select
                id="gen-type"
                value={proposalType}
                onChange={(e) => setProposalType(e.target.value)}
                className={inputClass}
              >
                {PROPOSAL_TYPES.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className={labelClass} htmlFor="gen-ref">
                Zuordnung (optional)
              </label>
              <select
                id="gen-ref"
                value={reference}
                onChange={(e) => {
                  const next = e.target.value as Reference;
                  setReference(next);
                  if (next !== "lead") setLeadId("");
                  if (next !== "client") setClientId("");
                }}
                className={inputClass}
              >
                <option value="">Keine Zuordnung</option>
                <option value="lead">Lead</option>
                <option value="client">Kunde</option>
              </select>
            </div>

            {reference === "lead" ? (
              <div className="space-y-1">
                <label className={labelClass} htmlFor="gen-lead">
                  Lead
                </label>
                <select
                  id="gen-lead"
                  value={leadId}
                  onChange={(e) => setLeadId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Bitte waehlen</option>
                  {options.leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.company_name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {reference === "client" ? (
              <div className="space-y-1">
                <label className={labelClass} htmlFor="gen-client">
                  Kunde
                </label>
                <select
                  id="gen-client"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Bitte waehlen</option>
                  {options.clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="space-y-1">
              <label className={labelClass} htmlFor="gen-title">
                Titel (optional)
              </label>
              <input
                id="gen-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z. B. Website-Relaunch 2026"
                className={inputClass}
              />
            </div>

            <div className="space-y-1">
              <label className={labelClass} htmlFor="gen-goal">
                Ziel (optional)
              </label>
              <textarea
                id="gen-goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                rows={3}
                placeholder="Worum geht es im Kern? Was soll erreicht werden?"
                className={inputClass}
              />
            </div>

            {error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="flex items-center justify-center py-10 text-neutral-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
      </Modal>
    </>
  );
}
