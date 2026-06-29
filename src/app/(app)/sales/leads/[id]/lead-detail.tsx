"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Trash2,
  UserPlus,
  Plus,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { QuickCreate } from "@/components/tasks/quick-create";
import { LeadForm } from "@/components/sales/lead-form";
import {
  LEAD_STATUSES,
  LEAD_SOURCE_LABELS,
  SALES_ACTIVITY_TYPES,
  SALES_ACTIVITY_TYPE_LABELS,
  COMPANY_SIZE_LABELS,
  statusLabel,
  type SalesActivityType,
} from "@/config/catalog";
import {
  moveLeadAction,
  deleteLeadAction,
  convertLeadAction,
  createSalesActivityAction,
} from "@/app/(app)/sales/actions";
import type { SalesFormOptions } from "@/app/(app)/sales/actions";
import { formatDate, formatCHF, cn } from "@/lib/utils";
import type {
  LeadWithRelations,
  SalesActivity,
  Meeting,
  Offer,
  TaskWithRelations,
} from "@/types/entities";

const TABS = [
  { key: "overview", label: "Uebersicht" },
  { key: "activities", label: "Aktivitaeten" },
  { key: "tasks", label: "Aufgaben" },
  { key: "offers", label: "Angebote" },
  { key: "contracts", label: "Verträge" },
  { key: "files", label: "Dateien" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const SOURCE_LABELS: Record<string, string> = {
  meta_ads: "Meta Ads",
  tiktok_ads: "TikTok Ads",
  google_ads: "Google Ads",
  linkedin_ads: "LinkedIn Ads",
  manual: "Manuell",
  vermittlung: "Vermittlung",
  lohnrechner: "Lohnrechner",
};
const sourceLabel = (s: string | null | undefined): string =>
  s ? SOURCE_LABELS[s] ?? s : "-";

// Deutsche Labels fuer die erfassten Formular-/Rohdaten-Felder.
const META_FIELD_LABELS: Record<string, string> = {
  situation: "Situation",
  zeitaufwand: "Zeitaufwand",
  pflegemassnahmen: "Pflegemassnahmen",
  nachricht: "Nachricht",
  message: "Nachricht",
  city: "Stadt",
  kanton: "Kanton",
  zip_code: "PLZ",
  street: "Strasse",
  birthdate: "Geburtsdatum",
  received_at: "Eingegangen am",
  form_name: "Formular",
  ad_name: "Anzeige",
  campaign_name: "Kampagne",
  dienstleistung: "Dienstleistung",
  company: "Firma",
  phone_number: "Telefon",
  phone: "Telefon",
  email: "E-Mail",
  work_email: "Geschaeftliche E-Mail",
  name: "Name",
  full_name: "Name",
  first_name: "Vorname",
  last_name: "Nachname",
  platform: "Plattform",
};
// Schluessel, die hier NICHT noch einmal erscheinen sollen (anderswo gezeigt / Rauschen).
const META_SKIP = new Set(["provider", "id", "org_id", "status", "source"]);

const prettyMetaLabel = (k: string): string =>
  META_FIELD_LABELS[k] ??
  k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** Flacht metadata_json (inkl. raw_data/raw/fields) zu Label/Wert-Paaren ab. */
function collectFormFields(
  meta: Record<string, unknown> | null | undefined,
): Array<[string, string]> {
  if (!meta || typeof meta !== "object") return [];
  const out = new Map<string, string>();
  const add = (k: string, v: unknown) => {
    if (v == null || typeof v === "object") return;
    const s = String(v).trim();
    if (!s || s.toLowerCase() === "null" || META_SKIP.has(k)) return;
    if (!out.has(k)) out.set(k, s);
  };
  const walk = (obj: unknown) => {
    if (!obj || typeof obj !== "object") return;
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (v && typeof v === "object") walk(v);
      else add(k, v);
    }
  };
  walk(meta);
  return [...out.entries()].map(([k, v]) => [prettyMetaLabel(k), v]);
}

const selectClass =
  "h-9 rounded-lg border border-neutral-300 bg-white px-2.5 text-sm font-medium focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

function scoreTone(score: number): "green" | "amber" | "neutral" {
  if (score >= 70) return "green";
  if (score >= 40) return "amber";
  return "neutral";
}

export function LeadDetail({
  lead,
  activities,
  meetings,
  tasks,
  offers,
  options,
}: {
  lead: LeadWithRelations;
  activities: SalesActivity[];
  meetings: Meeting[];
  tasks: TaskWithRelations[];
  offers: Offer[];
  options: SalesFormOptions;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("overview");
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function changeStatus(statusKey: string) {
    startTransition(async () => {
      await moveLeadAction(lead.id, statusKey);
      router.refresh();
    });
  }

  function convert() {
    if (
      !window.confirm(
        "Diesen Lead zu einem Kunden konvertieren? Es wird ein neuer Kunden-Datensatz angelegt.",
      )
    )
      return;
    startTransition(async () => {
      const r = await convertLeadAction(lead.id);
      if (r.ok) router.push("/clients");
    });
  }

  function remove() {
    if (!window.confirm("Lead wirklich loeschen?")) return;
    startTransition(async () => {
      const r = await deleteLeadAction(lead.id);
      if (r.ok) router.push("/sales/leads");
    });
  }

  return (
    <div className="space-y-5">
      <Link
        href="/sales/leads"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurueck zu Leads
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
            {lead.company_name}
          </h1>
          <Badge tone={scoreTone(lead.lead_score)}>
            Score {lead.lead_score}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={lead.status?.key ?? "new"}
            onChange={(e) => changeStatus(e.target.value)}
            disabled={pending}
            aria-label="Lead-Status aendern"
            className={selectClass}
          >
            {LEAD_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-4 w-4" />
            Bearbeiten
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={convert}
            disabled={pending}
          >
            <UserPlus className="h-4 w-4" />
            Zu Kunde konvertieren
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={remove}
            disabled={pending}
            aria-label="Lead loeschen"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <nav className="flex gap-1 overflow-x-auto border-b border-neutral-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === t.key
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-neutral-500 hover:text-neutral-800",
            )}
          >
            {t.label}
            {t.key === "activities" && activities.length > 0
              ? ` (${activities.length})`
              : ""}
            {t.key === "tasks" && tasks.length > 0 ? ` (${tasks.length})` : ""}
            {t.key === "offers" && offers.length > 0
              ? ` (${offers.length})`
              : ""}
          </button>
        ))}
      </nav>

      <Card>
        <CardContent className="p-5 sm:p-6">
          {tab === "overview" ? (
            <OverviewTab lead={lead} meetings={meetings} />
          ) : tab === "activities" ? (
            <ActivitiesTab leadId={lead.id} activities={activities} />
          ) : tab === "tasks" ? (
            <TasksTab leadId={lead.id} tasks={tasks} />
          ) : tab === "offers" ? (
            <OffersTab offers={offers} />
          ) : tab === "contracts" ? (
            <EmptyState
              title="Keine Verträge"
              description="Verträge entstehen nach Konvertierung des Leads zu einem Kunden oder nach Annahme eines Angebots."
            />
          ) : (
            <EmptyState
              title="Noch keine Dateien"
              description="Datei-Anhaenge folgen mit dem Operations-/Dateien-Modul (Upload via Supabase Storage)."
            />
          )}
        </CardContent>
      </Card>

      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Lead bearbeiten"
        size="lg"
      >
        <LeadForm
          mode="edit"
          leadId={lead.id}
          users={options.users}
          initial={{
            company_name: lead.company_name,
            contact_name: lead.contact_name,
            email: lead.email,
            phone: lead.phone,
            website: lead.website,
            industry: lead.industry,
            company_size: lead.company_size,
            city: lead.city,
            country: lead.country,
            source: lead.source,
            estimated_value: lead.estimated_value,
            status: lead.status?.key,
            owner_id: lead.owner_id,
            next_action_date: lead.next_action_date,
            notes: lead.notes,
          }}
          onCancel={() => setEditing(false)}
          onDone={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      </Modal>
    </div>
  );
}

/* ----------------------------------------------------------------------- */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-neutral-800">{children}</dd>
    </div>
  );
}

function OverviewTab({
  lead,
  meetings,
}: {
  lead: LeadWithRelations;
  meetings: Meeting[];
}) {
  const herkunft: Array<[string, string | null | undefined, boolean?]> = [
    ["Quelle", sourceLabel(lead.source)],
    ["Originalstatus (altes CRM)", lead.legacy_status],
    ["Kampagne", lead.campaign_name],
    ["Formular", lead.form_name ?? lead.form_id],
    ["Anzeige", lead.ad_name],
    ["Adset", lead.adset_name],
    ["Facebook Lead ID", lead.external_lead_id, true],
    ["Dienstleistung", lead.dienstleistung],
    ["Zuständig (Alt-CRM)", lead.assigned_to_name],
  ];
  const herkunftRows = herkunft.filter(([, v]) => v && v !== "-");
  const formFields = collectFormFields(lead.metadata_json);

  return (
    <div className="space-y-6">
      {herkunftRows.length > 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
          <h3 className="mb-3 text-sm font-semibold text-neutral-900">Herkunft &amp; Quelle</h3>
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {herkunftRows.map(([label, value, mono]) => (
              <div key={label}>
                <dt className="text-xs uppercase tracking-wide text-neutral-400">{label}</dt>
                <dd className={mono ? "mt-0.5 break-all font-mono text-xs text-neutral-700" : "mt-0.5 break-words font-medium text-neutral-800"}>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
      {formFields.length > 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-neutral-900">
            Formulardaten &amp; alle erfassten Angaben
          </h3>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            {formFields.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs uppercase tracking-wide text-neutral-400">{label}</dt>
                <dd className="mt-0.5 whitespace-pre-wrap break-words font-medium text-neutral-800">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Firma">{lead.company_name}</Field>
        <Field label="Ansprechpartner">{lead.contact_name ?? "-"}</Field>
        <Field label="E-Mail">
          {lead.email ? (
            <a
              href={`mailto:${lead.email}`}
              className="text-brand-700 hover:underline"
            >
              {lead.email}
            </a>
          ) : (
            "-"
          )}
        </Field>
        <Field label="Telefon">
          {lead.phone ? (
            <a
              href={`tel:${lead.phone}`}
              className="text-brand-700 hover:underline"
            >
              {lead.phone}
            </a>
          ) : (
            "-"
          )}
        </Field>
        <Field label="Website">
          {lead.website ? (
            <a
              href={lead.website}
              target="_blank"
              rel="noreferrer"
              className="text-brand-700 hover:underline"
            >
              {lead.website}
            </a>
          ) : (
            "-"
          )}
        </Field>
        <Field label="Branche">{lead.industry ?? "-"}</Field>
        <Field label="Unternehmensgroesse">
          {lead.company_size
            ? (COMPANY_SIZE_LABELS[
                lead.company_size as keyof typeof COMPANY_SIZE_LABELS
              ] ?? lead.company_size)
            : "-"}
        </Field>
        <Field label="Stadt / Land">
          {[lead.city, lead.country].filter(Boolean).join(", ") || "-"}
        </Field>
        <Field label="Quelle">
          {lead.source
            ? (LEAD_SOURCE_LABELS[
                lead.source as keyof typeof LEAD_SOURCE_LABELS
              ] ?? lead.source)
            : "-"}
        </Field>
        <Field label="Status">
          <StatusBadge label={lead.status?.label} color={lead.status?.color} />
        </Field>
        <Field label="Score">
          <Badge tone={scoreTone(lead.lead_score)}>{lead.lead_score}</Badge>
        </Field>
        <Field label="Geschaetzter Wert">
          {formatCHF(lead.estimated_value, lead.currency)}
        </Field>
        <Field label="Verantwortlich">
          {lead.owner?.full_name ?? "-"}
        </Field>
        <Field label="Naechstes Follow-up">
          {lead.next_action_date ? formatDate(lead.next_action_date) : "-"}
        </Field>
      </dl>

      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">
          Notizen
        </dt>
        <dd className="mt-1 text-sm text-neutral-700">
          {lead.notes ? (
            <p className="whitespace-pre-wrap leading-relaxed">{lead.notes}</p>
          ) : (
            <span className="italic text-neutral-400">Keine Notizen.</span>
          )}
        </dd>
      </div>

      {meetings.length > 0 ? (
        <div>
          <dt className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
            Termine
          </dt>
          <ul className="space-y-2">
            {meetings.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2 text-sm"
              >
                <span className="font-medium text-neutral-800">{m.title}</span>
                <span className="flex items-center gap-2 text-neutral-500">
                  {m.meeting_date ? formatDate(m.meeting_date) : "-"}
                  <StatusBadge label={statusLabel("meeting", m.status)} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ActivitiesTab({
  leadId,
  activities,
}: {
  leadId: string;
  activities: SalesActivity[];
}) {
  const router = useRouter();
  const [type, setType] = useState<SalesActivityType>(
    SALES_ACTIVITY_TYPES[0].key,
  );
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const r = await createSalesActivityAction({
        lead_id: leadId,
        type,
        subject: subject.trim() || undefined,
        body: body.trim() || undefined,
      });
      if (r.ok) {
        setSubject("");
        setBody("");
        setType(SALES_ACTIVITY_TYPES[0].key);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50/60 p-4"
      >
        <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700">
              Typ
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as SalesActivityType)}
              className={inputClass}
            >
              {SALES_ACTIVITY_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700">
              Betreff
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="z.B. Erstgespraech vereinbart"
              className={inputClass}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-neutral-700">
            Notiz
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className={inputClass}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Speichern ...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Aktivitaet erfassen
              </>
            )}
          </Button>
        </div>
      </form>

      {activities.length === 0 ? (
        <EmptyState
          title="Noch keine Aktivitaeten"
          description="Erfasse Calls, E-Mails, Meetings oder Notizen, um den Verlauf festzuhalten."
        />
      ) : (
        <ol className="relative space-y-4 border-l border-neutral-200 pl-5">
          {activities.map((a) => (
            <li key={a.id} className="relative">
              <span
                aria-hidden="true"
                className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-500"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand">
                  {SALES_ACTIVITY_TYPE_LABELS[
                    a.type as keyof typeof SALES_ACTIVITY_TYPE_LABELS
                  ] ?? a.type}
                </Badge>
                {a.subject ? (
                  <span className="text-sm font-medium text-neutral-900">
                    {a.subject}
                  </span>
                ) : null}
              </div>
              {a.body ? (
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
                  {a.body}
                </p>
              ) : null}
              <p className="mt-1 text-xs text-neutral-400">
                {formatDate(a.activity_date)}
                {a.author?.full_name ? ` · ${a.author.full_name}` : ""}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function TasksTab({
  leadId,
  tasks,
}: {
  leadId: string;
  tasks: TaskWithRelations[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <QuickCreate initial={{ lead_id: leadId }} label="Aufgabe" />
      </div>
      {tasks.length === 0 ? (
        <EmptyState
          title="Keine Aufgaben"
          description="Lege eine Aufgabe an, damit dieser Lead nicht liegen bleibt."
        />
      ) : (
        <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
          {tasks.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <Link
                href={`/tasks/${t.id}`}
                className="text-sm font-medium text-neutral-800 hover:text-brand-700"
              >
                {t.title}
              </Link>
              <StatusBadge label={t.status?.label} color={t.status?.color} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OffersTab({ offers }: { offers: Offer[] }) {
  if (offers.length === 0) {
    return (
      <EmptyState
        title="Keine Angebote"
        description="Fuer diesen Lead wurde noch kein Angebot erstellt."
      />
    );
  }
  return (
    <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
      {offers.map((o) => (
        <li
          key={o.id}
          className="flex items-center justify-between gap-3 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-neutral-800">
              {o.title}
            </p>
            <p className="text-sm text-neutral-500">
              {formatCHF(o.amount, o.currency)}
            </p>
          </div>
          <StatusBadge label={statusLabel("offer", o.status)} />
        </li>
      ))}
    </ul>
  );
}
