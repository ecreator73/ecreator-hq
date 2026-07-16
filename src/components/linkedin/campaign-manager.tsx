"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  Loader2,
  Megaphone,
  Pencil,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { LINKEDIN_CAMPAIGN_STATUSES, statusLabel } from "@/config/catalog";
import { cn } from "@/lib/utils";
import {
  archiveLinkedinCampaignAction,
  createLinkedinCampaignAction,
  updateLinkedinCampaignAction,
} from "@/app/(app)/sales/linkedin/actions";
import type { LinkedInCampaign } from "@/types/entities";
import type { LinkedInCampaignCreateInput } from "@/lib/validation/linkedin";

/** Kennzahlen je Kampagne (Shape von linkedinCampaignsService.stats()). */
export interface LinkedInCampaignStat {
  campaign: LinkedInCampaign;
  total: number;
  contacted: number;
  connected: number;
  replied: number;
  meetings: number;
  offers: number;
  won: number;
}

const STATUS_TONE: Record<LinkedInCampaign["status"], "green" | "amber" | "neutral"> = {
  active: "green",
  paused: "amber",
  archived: "neutral",
};

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export function CampaignManager({ stats }: { stats: LinkedInCampaignStat[] }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editFor, setEditFor] = useState<LinkedInCampaign | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function reset() {
    setError(null);
    setSuccess(null);
  }

  function archive(c: LinkedInCampaign) {
    if (!window.confirm(`Kampagne "${c.name}" wirklich archivieren?`)) return;
    reset();
    start(async () => {
      const r = await archiveLinkedinCampaignAction(c.id);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSuccess("Kampagne archiviert.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-neutral-500">
          {stats.length} Kampagne{stats.length === 1 ? "" : "n"}
        </p>
        <Button
          onClick={() => {
            reset();
            setCreateOpen(true);
          }}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Kampagne
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

      {stats.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Noch keine Kampagnen"
          description="Buendle deine LinkedIn-Akquise in Kampagnen pro Zielgruppe - z. B. Broker Schweiz, Spitex oder Treuhaender."
          action={
            <Button
              onClick={() => {
                reset();
                setCreateOpen(true);
              }}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Kampagne
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {stats.map((s) => {
            const c = s.campaign;
            const replyRate =
              s.contacted > 0 ? Math.round((s.replied / s.contacted) * 100) : null;
            return (
              <Card
                key={c.id}
                className={cn(c.status === "archived" && "opacity-70")}
              >
                <CardHeader className="flex-row items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="truncate">{c.name}</CardTitle>
                      <Badge tone={STATUS_TONE[c.status]}>
                        {statusLabel("linkedin_campaign", c.status)}
                      </Badge>
                    </div>
                    {c.description ? (
                      <p className="mt-1 text-sm text-neutral-500">
                        {c.description}
                      </p>
                    ) : null}
                    {c.target_audience ? (
                      <p className="mt-1 text-sm text-neutral-600">
                        <span className="text-neutral-400">Zielgruppe:</span>{" "}
                        {c.target_audience}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        reset();
                        setEditFor(c);
                      }}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      Bearbeiten
                    </Button>
                    {c.status !== "archived" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => archive(c)}
                        disabled={pending}
                      >
                        <Archive className="h-4 w-4" aria-hidden="true" />
                        Archivieren
                      </Button>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-4 gap-3 border-t border-neutral-100 pt-4 sm:grid-cols-8">
                    <Metric label="Prospects" value={s.total} />
                    <Metric label="Kontaktiert" value={s.contacted} />
                    <Metric label="Verbunden" value={s.connected} />
                    <Metric label="Antworten" value={s.replied} />
                    <Metric label="Termine" value={s.meetings} />
                    <Metric label="Angebote" value={s.offers} />
                    <Metric label="Gewonnen" value={s.won} />
                    <Metric
                      label="Antwortquote"
                      value={replyRate === null ? "-" : `${replyRate}%`}
                    />
                  </dl>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {createOpen ? (
        <CampaignFormModal
          mode="create"
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            setSuccess("Kampagne erstellt.");
            router.refresh();
          }}
        />
      ) : null}
      {editFor ? (
        <CampaignFormModal
          mode="edit"
          campaign={editFor}
          onClose={() => setEditFor(null)}
          onSaved={() => {
            setEditFor(null);
            setSuccess("Kampagne aktualisiert.");
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[11px] font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums text-neutral-900">
        {value}
      </dd>
    </div>
  );
}

function CampaignFormModal({
  mode,
  campaign,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  campaign?: LinkedInCampaign;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: campaign?.name ?? "",
    description: campaign?.description ?? "",
    target_audience: campaign?.target_audience ?? "",
    status: (campaign?.status ?? "active") as LinkedInCampaign["status"],
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    setError(null);
    if (!form.name.trim()) {
      setError("Bitte einen Kampagnen-Namen eingeben.");
      return;
    }
    const input: LinkedInCampaignCreateInput = {
      name: form.name.trim(),
      description: form.description || undefined,
      target_audience: form.target_audience || undefined,
      status: form.status,
    };
    start(async () => {
      const r =
        mode === "create"
          ? await createLinkedinCampaignAction(input)
          : await updateLinkedinCampaignAction(
              (campaign as LinkedInCampaign).id,
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
      title={mode === "create" ? "Kampagne anlegen" : `Kampagne bearbeiten — ${campaign?.name ?? ""}`}
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
            placeholder="z. B. Broker Schweiz Q3"
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
            placeholder="Worum geht es in dieser Kampagne? Angebot, Aufhaenger, Ziel ..."
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-neutral-700">
            Zielgruppe
          </label>
          <input
            value={form.target_audience}
            onChange={(e) => set("target_audience", e.target.value)}
            placeholder="Broker Schweiz, Spitex, Treuhaender, ..."
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-neutral-700">
            Status
          </label>
          <select
            value={form.status}
            onChange={(e) =>
              set("status", e.target.value as LinkedInCampaign["status"])
            }
            className={inputClass}
          >
            {LINKEDIN_CAMPAIGN_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
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

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            {mode === "create" ? "Kampagne erstellen" : "Speichern"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
