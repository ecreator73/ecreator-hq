"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { CAMPAIGN_STATUSES, CAMPAIGN_TYPES } from "@/config/catalog";
import { createCampaignAction } from "@/app/(app)/sales/outreach/actions";
import type { CampaignCreateInput } from "@/lib/validation/outreach";
import { cn } from "@/lib/utils";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

/** "+ Kampagne"-Button mit Modal (Name, Typ, Status) -> createCampaignAction. */
export function CampaignQuickCreate({
  variant = "primary",
  label = "Kampagne",
}: {
  variant?: "primary" | "secondary";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", campaign_type: "", status: "draft" });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function reset() {
    setForm({ name: "", campaign_type: "", status: "draft" });
    setError(null);
  }

  function submit() {
    setError(null);
    if (!form.name.trim()) {
      setError("Bitte einen Kampagnennamen eingeben.");
      return;
    }
    const input: CampaignCreateInput = {
      name: form.name.trim(),
      campaign_type: (form.campaign_type || undefined) as CampaignCreateInput["campaign_type"],
      status: (form.status || undefined) as CampaignCreateInput["status"],
    };

    startTransition(async () => {
      const result = await createCampaignAction(input);
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
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium shadow-sm transition-colors",
          variant === "primary"
            ? "bg-brand-600 text-white hover:bg-brand-700"
            : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50",
        )}
      >
        <Plus className="h-4 w-4" />
        {label}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Neue Kampagne"
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
            <label className="block text-sm font-medium text-neutral-700">
              Name *
            </label>
            <input
              autoFocus
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="z. B. Website-Audit Q3"
              className={inputClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-neutral-700">Typ</label>
              <select
                value={form.campaign_type}
                onChange={(e) => set("campaign_type", e.target.value)}
                className={inputClass}
              >
                <option value="">- keine Angabe -</option>
                {CAMPAIGN_TYPES.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-neutral-700">Status</label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className={inputClass}
              >
                {CAMPAIGN_STATUSES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
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
                "Kampagne erstellen"
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
