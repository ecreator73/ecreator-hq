"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import {
  auditFormOptionsAction,
  createAuditAction,
} from "@/app/(app)/sales/audits/actions";
import type { AuditCreateInput } from "@/lib/validation/website-audit";
import { cn } from "@/lib/utils";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

type Company = { id: string; name: string; website: string | null };

/**
 * "+ Audit"-Button mit Modal. Auswahl einer Lead-Firma (lead_company_id) ODER
 * direkte URL-Eingabe (mind. eins). Bei Erfolg push auf das neue Audit-Detail.
 */
export function AuditCreate({ label = "Audit" }: { label?: string }) {
  const [open, setOpen] = useState(false);
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [companyId, setCompanyId] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (open && !companies) {
      auditFormOptionsAction().then((r) =>
        setCompanies(r.ok && r.data ? r.data.companies : []),
      );
    }
  }, [open, companies]);

  function reset() {
    setCompanyId("");
    setUrl("");
    setError(null);
    setSaving(false);
  }

  function close() {
    setOpen(false);
    reset();
  }

  async function submit() {
    setError(null);
    const trimmedUrl = url.trim();
    if (!companyId && !trimmedUrl) {
      setError("Bitte eine Firma auswaehlen oder eine URL eingeben.");
      return;
    }
    setSaving(true);
    const input: AuditCreateInput = {
      url: trimmedUrl || undefined,
      lead_company_id: companyId || undefined,
    };
    const res = await createAuditAction(input);
    if (res.ok && res.data) {
      router.push(`/sales/audits/${res.data.id}`);
    } else {
      setSaving(false);
      setError(res.ok ? "Audit konnte nicht erstellt werden." : res.error);
    }
  }

  return (
    <>
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

      <Modal open={open} onClose={close} title="Neues Website-Audit" size="md">
        {companies ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="audit-company"
                className="block text-sm font-medium text-neutral-700"
              >
                Lead-Firma
              </label>
              <select
                id="audit-company"
                className={inputClass}
                value={companyId}
                onChange={(e) => {
                  setCompanyId(e.target.value);
                  setError(null);
                }}
              >
                <option value="">— Keine Firma —</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.website ? ` (${c.website})` : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs text-neutral-400">
                Waehle eine bestehende Lead-Firma oder gib unten direkt eine URL ein.
              </p>
            </div>

            <div className="relative flex items-center">
              <span className="h-px flex-1 bg-neutral-100" />
              <span className="px-3 text-xs font-medium uppercase tracking-wide text-neutral-400">
                oder
              </span>
              <span className="h-px flex-1 bg-neutral-100" />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="audit-url"
                className="block text-sm font-medium text-neutral-700"
              >
                Website-URL
              </label>
              <input
                id="audit-url"
                type="url"
                inputMode="url"
                placeholder="https://beispiel.ch"
                className={inputClass}
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError(null);
                }}
              />
            </div>

            {error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={close} disabled={saving}>
                Abbrechen
              </Button>
              <Button onClick={submit} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Erstellen…
                  </>
                ) : (
                  "Audit erstellen"
                )}
              </Button>
            </div>
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
