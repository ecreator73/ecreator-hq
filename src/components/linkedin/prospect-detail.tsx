"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Archive,
  ArrowLeft,
  ArrowRightLeft,
  CalendarClock,
  ExternalLink,
  Flame,
  Linkedin,
  Loader2,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/tasks/status-badge";
import {
  LINKEDIN_PROSPECT_STATUSES,
  LINKEDIN_PRIORITIES,
  statusLabel,
  type LinkedInProspectStatus,
} from "@/config/catalog";
import {
  HOT_PROSPECT_THRESHOLD,
  matchingServices,
  type ProspectInsight,
} from "@/lib/linkedin";
import {
  moveProspectAction,
  updateProspectAction,
  deleteProspectAction,
  convertProspectAction,
} from "@/app/(app)/sales/linkedin/actions";
import type { LinkedInProspectUpdateInput } from "@/lib/validation/linkedin";
import { formatDate, cn } from "@/lib/utils";
import type {
  LinkedInProspectWithRelations,
  LinkedInActivity,
  LinkedInMessage,
  LinkedInMessageTemplate,
  TaskWithRelations,
} from "@/types/entities";
import {
  ActivitiesTab,
  MessagesTab,
  NotesTab,
  TasksTab,
  FilesTab,
} from "./prospect-detail-tabs";

/* ------------------------------------------------------------------ types */

export interface ProspectFormOptions {
  users: Array<{ id: string; full_name: string }>;
  campaigns: Array<{ id: string; name: string }>;
}

const TABS = [
  { key: "uebersicht", label: "Uebersicht" },
  { key: "aktivitaeten", label: "Aktivitaeten" },
  { key: "nachrichten", label: "Nachrichten" },
  { key: "notizen", label: "Notizen" },
  { key: "aufgaben", label: "Aufgaben" },
  { key: "dateien", label: "Dateien" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const todayIso = () => new Date().toISOString().slice(0, 10);

const ACTION_BTN =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:border-brand-300 hover:text-brand-700 disabled:opacity-50";

/* ------------------------------------------------------------------ shell */

export function ProspectDetail({
  prospect,
  activities,
  messages,
  tasks,
  templates,
  options,
  insights,
}: {
  prospect: LinkedInProspectWithRelations;
  activities: LinkedInActivity[];
  messages: LinkedInMessage[];
  tasks: TaskWithRelations[];
  templates: LinkedInMessageTemplate[];
  options: ProspectFormOptions;
  insights: ProspectInsight[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("uebersicht");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const statusEntry = LINKEDIN_PROSPECT_STATUSES.find(
    (s) => s.key === prospect.status,
  );
  const hot = prospect.lead_score >= HOT_PROSPECT_THRESHOLD;
  const subtitle =
    [prospect.position, prospect.company_name].filter(Boolean).join(" @ ") ||
    "Keine Angaben zu Position und Firma";

  function flash(msg: string) {
    setError(null);
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 2500);
  }

  function changeStatus(next: string) {
    start(async () => {
      const r = await moveProspectAction(
        prospect.id,
        next as LinkedInProspectStatus,
      );
      if (!r.ok) {
        setError(r.error);
        return;
      }
      flash("Status aktualisiert - Follow-up wird automatisch geplant.");
      router.refresh();
    });
  }

  function convert() {
    if (
      !window.confirm(
        "Prospect in einen Lead umwandeln? Der Prospect wird danach archiviert.",
      )
    )
      return;
    start(async () => {
      const r = await convertProspectAction(prospect.id);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      if (r.data) router.push(`/sales/leads/${r.data.leadId}`);
      else router.refresh();
    });
  }

  function remove() {
    if (!window.confirm("Prospect wirklich loeschen?")) return;
    start(async () => {
      const r = await deleteProspectAction(prospect.id);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.push("/sales/linkedin/prospects");
    });
  }

  return (
    <div className="space-y-4">
      <Link
        href="/sales/linkedin/prospects"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800"
      >
        <ArrowLeft className="h-4 w-4" /> Zurueck zu Prospects
      </Link>

      {/* Archiv-Banner */}
      {prospect.archived_at ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-100 px-4 py-2.5 text-sm text-neutral-600">
          <Archive className="h-4 w-4 shrink-0" />
          Archiviert - als Lead weitergefuehrt.
          {prospect.converted_lead_id ? (
            <Link
              href={`/sales/leads/${prospect.converted_lead_id}`}
              className="font-medium text-brand-600 hover:underline"
            >
              Lead oeffnen
            </Link>
          ) : null}
        </div>
      ) : null}

      {/* HEADER */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
                {prospect.full_name}
              </h1>
              <StatusBadge
                label={
                  statusEntry?.label ??
                  statusLabel("linkedin_prospect", prospect.status)
                }
                color={statusEntry?.color}
              />
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  hot
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-600",
                )}
              >
                {hot ? <Flame className="h-3.5 w-3.5" /> : null}
                Score {prospect.lead_score}
                {hot ? " · Hot" : ""}
              </span>
            </div>
            <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
            <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
              <HeaderFact
                label="Kampagne"
                value={prospect.campaign?.name ?? "—"}
              />
              <HeaderFact
                label="Verantwortlich"
                value={prospect.owner?.full_name ?? "Nicht zugewiesen"}
              />
              <HeaderFact
                label="Naechstes Follow-up"
                value={
                  prospect.next_followup_date
                    ? formatDate(prospect.next_followup_date)
                    : "—"
                }
              />
              <HeaderFact
                label="Erstellt"
                value={prospect.created_at ? formatDate(prospect.created_at) : "—"}
              />
            </dl>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <select
              value={prospect.status}
              onChange={(e) => changeStatus(e.target.value)}
              disabled={pending}
              aria-label="Status aendern"
              className="h-9 rounded-lg border border-neutral-300 bg-white px-2.5 text-sm font-medium text-neutral-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              {LINKEDIN_PROSPECT_STATUSES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              aria-label="Prospect loeschen"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Aktions-Leiste */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-4">
          {prospect.linkedin_url ? (
            <a
              href={prospect.linkedin_url}
              target="_blank"
              rel="noreferrer"
              className={ACTION_BTN}
            >
              <Linkedin className="h-4 w-4" /> Auf LinkedIn oeffnen
              <ExternalLink className="h-3.5 w-3.5 text-neutral-400" />
            </a>
          ) : (
            <span className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-400">
              <Linkedin className="h-4 w-4" /> Keine LinkedIn-URL hinterlegt
            </span>
          )}
          {prospect.converted_lead_id ? (
            <span className="inline-flex items-center gap-2">
              <Badge tone="green">Bereits konvertiert</Badge>
              <Link
                href={`/sales/leads/${prospect.converted_lead_id}`}
                className="text-sm font-medium text-brand-600 hover:underline"
              >
                Lead oeffnen
              </Link>
            </span>
          ) : (
            <button
              type="button"
              onClick={convert}
              disabled={pending}
              className={ACTION_BTN}
            >
              <ArrowRightLeft className="h-4 w-4" /> In Lead umwandeln
            </button>
          )}
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-neutral-400">
            <Pencil className="h-3.5 w-3.5" /> Felder in der Uebersicht sind
            direkt bearbeitbar
          </span>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      {/* TABS */}
      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-neutral-200 bg-white p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t.key
                ? "bg-brand-600 text-white"
                : "text-neutral-600 hover:bg-neutral-100",
            )}
          >
            {t.label}
            {t.key === "aktivitaeten" && activities.length
              ? ` ${activities.length}`
              : ""}
            {t.key === "nachrichten" && messages.length
              ? ` ${messages.length}`
              : ""}
            {t.key === "aufgaben" && tasks.length ? ` ${tasks.length}` : ""}
          </button>
        ))}
      </nav>

      {tab === "uebersicht" ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0 space-y-4">
            <ContactCard prospect={prospect} options={options} />
            <ResearchCard prospect={prospect} />
          </div>
          <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            <InsightsCard insights={insights} />
            <ServicesCard prospect={prospect} />
            <FollowupCard prospect={prospect} />
          </aside>
        </div>
      ) : tab === "aktivitaeten" ? (
        <ActivitiesTab prospectId={prospect.id} activities={activities} />
      ) : tab === "nachrichten" ? (
        <MessagesTab
          prospectId={prospect.id}
          messages={messages}
          templates={templates}
        />
      ) : tab === "notizen" ? (
        <NotesTab prospectId={prospect.id} notes={prospect.notes_md} />
      ) : tab === "aufgaben" ? (
        <TasksTab tasks={tasks} />
      ) : (
        <FilesTab />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ bits */

function HeaderFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-neutral-400">
        {label}
      </dt>
      <dd className="font-medium text-neutral-800">{value}</dd>
    </div>
  );
}

/* ---------------------------------------------------------- Kontaktdaten */

function ContactCard({
  prospect,
  options,
}: {
  prospect: LinkedInProspectWithRelations;
  options: ProspectFormOptions;
}) {
  const campaignOptions = [
    { value: "", label: "Keine Kampagne" },
    ...options.campaigns.map((c) => ({ value: c.id, label: c.name })),
  ];
  const ownerOptions = [
    { value: "", label: "Nicht zugewiesen" },
    ...options.users.map((u) => ({ value: u.id, label: u.full_name })),
  ];
  const priorityOptions = LINKEDIN_PRIORITIES.map((p) => ({
    value: p.key,
    label: p.label,
  }));
  const priorityLabel =
    LINKEDIN_PRIORITIES.find((p) => p.key === prospect.priority)?.label ??
    prospect.priority;

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <h3 className="mb-3 text-sm font-semibold text-neutral-900">
          Kontaktdaten
        </h3>
        <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          <EditableField
            prospectId={prospect.id}
            field="email"
            label="E-Mail"
            value={prospect.email}
            type="email"
          />
          <EditableField
            prospectId={prospect.id}
            field="phone"
            label="Telefon"
            value={prospect.phone}
          />
          <EditableField
            prospectId={prospect.id}
            field="website"
            label="Website"
            value={prospect.website}
          />
          <EditableField
            prospectId={prospect.id}
            field="location"
            label="Standort"
            value={prospect.location}
          />
          <EditableField
            prospectId={prospect.id}
            field="industry"
            label="Branche"
            value={prospect.industry}
          />
          <EditableField
            prospectId={prospect.id}
            field="company_size"
            label="Firmengroesse"
            value={prospect.company_size}
          />
          <EditableField
            prospectId={prospect.id}
            field="campaign_id"
            label="Kampagne"
            value={prospect.campaign_id}
            options={campaignOptions}
            display={prospect.campaign?.name ?? "Keine Kampagne"}
          />
          <EditableField
            prospectId={prospect.id}
            field="owner_id"
            label="Verantwortlich"
            value={prospect.owner_id}
            options={ownerOptions}
            display={prospect.owner?.full_name ?? "Nicht zugewiesen"}
          />
          <EditableField
            prospectId={prospect.id}
            field="priority"
            label="Prioritaet"
            value={prospect.priority}
            options={priorityOptions}
            display={priorityLabel}
          />
        </dl>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------- Editable field */

function EditableField({
  prospectId,
  field,
  label,
  value,
  display,
  type = "text",
  options,
}: {
  prospectId: string;
  field: keyof LinkedInProspectUpdateInput;
  label: string;
  value: string | null;
  display?: string;
  type?: string;
  options?: Array<{ value: string; label: string }>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const current = value ?? "";
  const shown = display ?? (current.trim() !== "" ? current : "—");

  function save(next: string) {
    if (next === current) {
      setEditing(false);
      return;
    }
    start(async () => {
      const r = await updateProspectAction(prospectId, {
        [field]: next === "" ? null : next,
      } as LinkedInProspectUpdateInput);
      if (!r.ok) {
        setErr(r.error);
        return;
      }
      setErr(null);
      setEditing(false);
      router.refresh();
    });
  }

  const inputCls =
    "h-8 w-full rounded-md border border-brand-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100";

  return (
    <div className="group border-b border-neutral-100 py-2 last:border-0">
      <div className="flex items-center justify-between gap-3">
        <dt className="shrink-0 text-xs uppercase tracking-wide text-neutral-400">
          {label}
        </dt>
        <dd className="min-w-0 flex-1 text-right">
          {editing ? (
            <div className="flex items-center justify-end gap-1">
              {options ? (
                <select
                  autoFocus
                  value={val}
                  onChange={(e) => setVal(e.target.value)}
                  onBlur={() => save(val)}
                  className={inputCls + " max-w-[12rem]"}
                >
                  {options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  autoFocus
                  type={type}
                  value={val}
                  onChange={(e) => setVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") save(val);
                    if (e.key === "Escape") setEditing(false);
                  }}
                  onBlur={() => save(val)}
                  className={inputCls + " max-w-[14rem] text-right"}
                />
              )}
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-400" />
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setVal(current);
                setEditing(true);
              }}
              className="inline-flex max-w-full items-center gap-1.5 rounded px-1 text-sm font-medium text-neutral-800 hover:bg-neutral-100"
            >
              <span className="truncate">{shown}</span>
              <Pencil className="h-3 w-3 shrink-0 text-transparent group-hover:text-neutral-300" />
            </button>
          )}
        </dd>
      </div>
      {err ? <p className="mt-1 text-right text-xs text-red-600">{err}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------- Recherche */

type ResearchFieldKey =
  | "company_description"
  | "services"
  | "social_links"
  | "google_reviews"
  | "possible_problems"
  | "potential_website"
  | "potential_seo"
  | "potential_ads"
  | "potential_crm"
  | "potential_marketing";

const RESEARCH_FIELDS: Array<{ field: ResearchFieldKey; label: string }> = [
  { field: "company_description", label: "Unternehmensbeschreibung" },
  { field: "services", label: "Angebotene Leistungen" },
  { field: "social_links", label: "Social-Media-Profile" },
  { field: "google_reviews", label: "Google-Bewertungen" },
  { field: "possible_problems", label: "Moegliche Probleme / Schwachstellen" },
  { field: "potential_website", label: "Potenzial: Webseiten" },
  { field: "potential_seo", label: "Potenzial: SEO" },
  { field: "potential_ads", label: "Potenzial: Performance Marketing" },
  { field: "potential_crm", label: "Potenzial: CRM & Automatisierungen" },
  { field: "potential_marketing", label: "Potenzial: Marketing-Strategie" },
];

function ResearchCard({
  prospect,
}: {
  prospect: LinkedInProspectWithRelations;
}) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="mb-1 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-neutral-900">Recherche</h3>
          <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400">
            <Sparkles className="h-3.5 w-3.5" /> KI ergaenzt diese Felder
            spaeter automatisch
          </span>
        </div>
        <p className="mb-3 text-xs text-neutral-500">
          Grundlage fuer Insights und personalisierte Nachrichten - je
          vollstaendiger, desto besser.
        </p>
        <div className="space-y-4">
          {RESEARCH_FIELDS.map((f) => (
            <ResearchField
              key={f.field}
              prospectId={prospect.id}
              field={f.field}
              label={f.label}
              value={prospect[f.field]}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ResearchField({
  prospectId,
  field,
  label,
  value,
}: {
  prospectId: string;
  field: ResearchFieldKey;
  label: string;
  value: string | null;
}) {
  const router = useRouter();
  const [val, setVal] = useState(value ?? "");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const dirty = val !== (value ?? "");

  function save() {
    start(async () => {
      const r = await updateProspectAction(prospectId, {
        [field]: val.trim() === "" ? null : val,
      } as LinkedInProspectUpdateInput);
      if (!r.ok) {
        setErr(r.error);
        return;
      }
      setErr(null);
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 1500);
    });
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <label className="text-xs font-medium uppercase tracking-wide text-neutral-400">
          {label}
        </label>
        {saved ? (
          <span className="text-xs text-emerald-600">Gespeichert</span>
        ) : dirty ? (
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Speichern
          </button>
        ) : null}
      </div>
      <textarea
        value={val}
        onChange={(e) => setVal(e.target.value)}
        rows={val.length > 160 ? 4 : 2}
        placeholder="Noch nicht recherchiert …"
        className="block w-full resize-y rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm leading-relaxed focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
      />
      {err ? <p className="mt-1 text-xs text-red-600">{err}</p> : null}
    </div>
  );
}

/* --------------------------------------------------------------- Sidebar */

const INSIGHT_DOT: Record<ProspectInsight["tone"], string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  blue: "bg-blue-500",
};

function InsightsCard({ insights }: { insights: ProspectInsight[] }) {
  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-4 shadow-sm">
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-brand-800">
        <Sparkles className="h-4 w-4" /> KI-Insights
      </h3>
      {insights.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Recherche ergaenzen fuer Insights.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {insights.map((ins, i) => (
            <li key={i} className="flex items-start gap-2">
              <span
                className={cn(
                  "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                  INSIGHT_DOT[ins.tone],
                )}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-800">
                  {ins.title}
                </p>
                <p className="text-xs text-neutral-500">{ins.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11px] text-neutral-400">
        Regelbasiert aus den erfassten Daten - keine externen Annahmen.
      </p>
    </div>
  );
}

function ServicesCard({
  prospect,
}: {
  prospect: LinkedInProspectWithRelations;
}) {
  const services = matchingServices(prospect);
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold text-neutral-900">
        Passende Dienstleistungen
      </h3>
      {services.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Potenzial-Felder in der Recherche fuellen, um passende Leistungen
          abzuleiten.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {services.map((s) => (
            <Badge key={s} tone="brand">
              {s}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function FollowupCard({
  prospect,
}: {
  prospect: LinkedInProspectWithRelations;
}) {
  const date = prospect.next_followup_date;
  const overdue = Boolean(date && date < todayIso());
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
        <CalendarClock className="h-4 w-4 text-neutral-400" /> Follow-up
      </h3>
      {date ? (
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "text-sm font-medium",
              overdue ? "text-red-600" : "text-neutral-800",
            )}
          >
            {formatDate(date)}
          </span>
          {overdue ? <Badge tone="red">Ueberfaellig</Badge> : null}
        </div>
      ) : (
        <p className="text-sm text-neutral-500">
          Kein Follow-up geplant - beim naechsten Statuswechsel wird
          automatisch eines erstellt.
        </p>
      )}
    </div>
  );
}
