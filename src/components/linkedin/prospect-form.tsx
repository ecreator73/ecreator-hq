"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ChevronDown, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import {
  LINKEDIN_PROSPECT_STATUSES,
  LINKEDIN_PRIORITIES,
} from "@/config/catalog";
import {
  createProspectAction,
  updateProspectAction,
} from "@/app/(app)/sales/linkedin/actions";
import type { LinkedInProspectCreateInput } from "@/lib/validation/linkedin";
import type { LinkedInProspectWithRelations } from "@/types/entities";
import { cn } from "@/lib/utils";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"] as const;

const RESEARCH_FIELDS = [
  { key: "company_description", label: "Firmenbeschreibung" },
  { key: "services", label: "Dienstleistungen" },
  { key: "social_links", label: "Social-Media-Links" },
  { key: "google_reviews", label: "Google Bewertungen" },
  { key: "possible_problems", label: "Moegliche Probleme" },
  { key: "potential_marketing", label: "Potenzial Marketing" },
  { key: "potential_crm", label: "Potenzial CRM" },
  { key: "potential_seo", label: "Potenzial SEO" },
  { key: "potential_ads", label: "Potenzial Ads" },
  { key: "potential_website", label: "Potenzial Website" },
] as const;

type ResearchKey = (typeof RESEARCH_FIELDS)[number]["key"];

function buildState(initial: LinkedInProspectWithRelations | null | undefined) {
  return {
    full_name: initial?.full_name ?? "",
    company_name: initial?.company_name ?? "",
    position: initial?.position ?? "",
    industry: initial?.industry ?? "",
    company_size: initial?.company_size ?? "",
    location: initial?.location ?? "",
    linkedin_url: initial?.linkedin_url ?? "",
    website: initial?.website ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    status: initial?.status ?? "neu",
    campaign_id: initial?.campaign_id ?? "",
    owner_id: initial?.owner_id ?? "",
    priority: initial?.priority ?? "medium",
    next_followup_date: initial?.next_followup_date ?? "",
    company_description: initial?.company_description ?? "",
    services: initial?.services ?? "",
    social_links: initial?.social_links ?? "",
    google_reviews: initial?.google_reviews ?? "",
    possible_problems: initial?.possible_problems ?? "",
    potential_marketing: initial?.potential_marketing ?? "",
    potential_crm: initial?.potential_crm ?? "",
    potential_seo: initial?.potential_seo ?? "",
    potential_ads: initial?.potential_ads ?? "",
    potential_website: initial?.potential_website ?? "",
  };
}

export function ProspectForm({
  open,
  onClose,
  initial,
  options,
}: {
  open: boolean;
  onClose: () => void;
  initial?: LinkedInProspectWithRelations | null;
  options: {
    users: { id: string; full_name: string }[];
    campaigns: { id: string; name: string }[];
  };
}) {
  const router = useRouter();
  const isEdit = !!initial;
  const [form, setForm] = useState(() => buildState(initial));
  const [error, setError] = useState<string | null>(null);
  const [showResearch, setShowResearch] = useState(false);
  const [pending, startTransition] = useTransition();

  // Beim Oeffnen den Zustand aus `initial` frisch aufbauen (create <-> edit).
  useEffect(() => {
    if (!open) return;
    setForm(buildState(initial));
    setError(null);
    setShowResearch(false);
  }, [open, initial]);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    setError(null);
    if (!form.full_name.trim()) {
      setError("Bitte einen Namen eingeben.");
      return;
    }
    const input: LinkedInProspectCreateInput = {
      full_name: form.full_name.trim(),
      company_name: form.company_name || undefined,
      position: form.position || undefined,
      industry: form.industry || undefined,
      company_size: form.company_size || undefined,
      location: form.location || undefined,
      linkedin_url: form.linkedin_url || undefined,
      website: form.website || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      status: form.status as LinkedInProspectCreateInput["status"],
      campaign_id: form.campaign_id || undefined,
      owner_id: form.owner_id || undefined,
      priority: form.priority as LinkedInProspectCreateInput["priority"],
      next_followup_date: form.next_followup_date || undefined,
      company_description: form.company_description || undefined,
      services: form.services || undefined,
      social_links: form.social_links || undefined,
      google_reviews: form.google_reviews || undefined,
      possible_problems: form.possible_problems || undefined,
      potential_marketing: form.potential_marketing || undefined,
      potential_crm: form.potential_crm || undefined,
      potential_seo: form.potential_seo || undefined,
      potential_ads: form.potential_ads || undefined,
      potential_website: form.potential_website || undefined,
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateProspectAction(initial?.id as string, input)
        : await createProspectAction(input);
      if (result.ok) {
        onClose();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Prospect bearbeiten" : "Neuer Prospect"}
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
          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-sm font-medium text-neutral-700">
              Name *
            </label>
            <input
              autoFocus
              value={form.full_name}
              onChange={(e) => set("full_name", e.target.value)}
              className={inputClass}
            />
          </div>
          <Field label="Firma">
            <input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Position">
            <input value={form.position} onChange={(e) => set("position", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Branche">
            <input value={form.industry} onChange={(e) => set("industry", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Unternehmensgroesse">
            <select value={form.company_size} onChange={(e) => set("company_size", e.target.value)} className={inputClass}>
              <option value="">- keine Angabe -</option>
              {COMPANY_SIZES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Standort">
            <input value={form.location} onChange={(e) => set("location", e.target.value)} className={inputClass} />
          </Field>
          <Field label="LinkedIn URL">
            <input value={form.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} placeholder="https://www.linkedin.com/in/..." className={inputClass} />
          </Field>
          <Field label="Website">
            <input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" className={inputClass} />
          </Field>
          <Field label="Telefon">
            <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputClass} />
          </Field>
          <Field label="E-Mail">
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => set("status", e.target.value)} className={inputClass}>
              {LINKEDIN_PROSPECT_STATUSES.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Kampagne">
            <select value={form.campaign_id} onChange={(e) => set("campaign_id", e.target.value)} className={inputClass}>
              <option value="">- keine -</option>
              {options.campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Verantwortlich">
            <select value={form.owner_id} onChange={(e) => set("owner_id", e.target.value)} className={inputClass}>
              <option value="">- niemand -</option>
              {options.users.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
          </Field>
          <Field label="Prioritaet">
            <select value={form.priority} onChange={(e) => set("priority", e.target.value)} className={inputClass}>
              {LINKEDIN_PRIORITIES.map((p) => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Naechster Follow-up">
            <input type="date" value={form.next_followup_date} onChange={(e) => set("next_followup_date", e.target.value)} className={inputClass} />
          </Field>
        </div>

        {/* Recherche-Sektion (nur beim Bearbeiten, aufklappbar) */}
        {isEdit ? (
          <div className="rounded-lg border border-neutral-200">
            <button
              type="button"
              onClick={() => setShowResearch((v) => !v)}
              aria-expanded={showResearch}
              className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Recherche
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-neutral-400 transition-transform",
                  showResearch && "rotate-180",
                )}
              />
            </button>
            {showResearch ? (
              <div className="grid gap-4 border-t border-neutral-100 p-3 sm:grid-cols-2">
                {RESEARCH_FIELDS.map(({ key, label }) => (
                  <Field key={key} label={label}>
                    <textarea
                      value={form[key as ResearchKey]}
                      onChange={(e) => set(key as ResearchKey, e.target.value)}
                      rows={3}
                      className={inputClass}
                    />
                  </Field>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Speichern ...
              </>
            ) : isEdit ? (
              "Speichern"
            ) : (
              "Prospect erstellen"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-neutral-700">{label}</label>
      {children}
    </div>
  );
}
