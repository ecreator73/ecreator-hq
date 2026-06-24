"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import {
  createReviewAction,
  growthFormOptionsAction,
} from "@/app/(app)/clients/growth/actions";
import type { ReviewRequestCreateInput } from "@/lib/validation/growth";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

/** "+ Bewertung anfragen"-Button mit Modal. Erfasst eine Review-Anfrage fuer einen Kunden. */
export function ReviewQuickCreate({
  label = "Bewertung anfragen",
}: {
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<{ id: string; name: string }[] | null>(
    null,
  );
  const [form, setForm] = useState({
    client_id: "",
    request_date: "",
    review_url: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (open && !clients) {
      growthFormOptionsAction().then((r) =>
        setClients(r.ok && r.data ? r.data.clients : []),
      );
    }
  }, [open, clients]);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function close() {
    setOpen(false);
    setError(null);
    setForm({ client_id: "", request_date: "", review_url: "" });
  }

  function submit() {
    setError(null);
    if (!form.client_id) {
      setError("Bitte einen Kunden auswaehlen.");
      return;
    }
    const input: ReviewRequestCreateInput = {
      client_id: form.client_id,
      request_date: form.request_date || undefined,
      review_url: form.review_url.trim() || undefined,
    };
    startTransition(async () => {
      const result = await createReviewAction(input);
      if (result.ok) {
        close();
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
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
      >
        <Plus className="h-4 w-4" />
        {label}
      </button>

      <Modal open={open} onClose={close} title="Bewertung anfragen" size="md">
        {clients ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-neutral-700">
                Kunde *
              </label>
              <select
                value={form.client_id}
                onChange={(e) => set("client_id", e.target.value)}
                className={inputClass}
              >
                <option value="">- Kunde waehlen -</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-neutral-700">
                Anfragedatum
              </label>
              <input
                type="date"
                value={form.request_date}
                onChange={(e) => set("request_date", e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-neutral-700">
                Bewertungs-Link
              </label>
              <input
                value={form.review_url}
                onChange={(e) => set("review_url", e.target.value)}
                placeholder="https://"
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
              <Button type="button" variant="secondary" onClick={close}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Speichern ...
                  </>
                ) : (
                  "Anfrage erstellen"
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-center py-10 text-neutral-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
      </Modal>
    </>
  );
}
