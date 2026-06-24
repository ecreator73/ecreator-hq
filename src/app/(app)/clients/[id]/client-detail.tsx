"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Plus,
  Rocket,
  LogOut,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { QuickCreate } from "@/components/tasks/quick-create";
import { ClientForm } from "@/components/clients/client-form";
import { ClientWarnings } from "@/components/clients/client-warnings";
import { ReportingCallQuickCreate } from "@/components/clients/reporting-call-quick-create";
import {
  CLIENT_INTERACTION_TYPES,
  CLIENT_INTERACTION_TYPE_LABELS,
  CLIENT_PACKAGE_LABELS,
  REPORTING_CALL_STATUSES,
  statusLabel,
  type ClientInteractionType,
} from "@/config/catalog";
import {
  startOnboardingAction,
  createChecklistAction,
  toggleChecklistItemAction,
  createClientInteractionAction,
  markReportingCallStatusAction,
} from "@/app/(app)/clients/actions";
import { formatDate, formatCHF, cn } from "@/lib/utils";
import type {
  ClientWithStats,
  Project,
  TaskWithRelations,
  ReportingCallWithRelations,
  ClientInteraction,
  ClientChecklist,
  ClientChecklistItem,
  FileRecord,
  Contract,
  ProfileMini,
} from "@/types/entities";

const TABS = [
  { key: "overview", label: "Uebersicht" },
  { key: "projects", label: "Projekte" },
  { key: "tasks", label: "Aufgaben" },
  { key: "reporting", label: "Reporting" },
  { key: "files", label: "Dateien" },
  { key: "invoices", label: "Rechnungen" },
  { key: "activity", label: "Aktivitaet" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

const CHECKLIST_LABELS: Record<string, string> = {
  onboarding: "Onboarding",
  offboarding: "Offboarding",
};

/** Aktiver Vertrag (Status "active"), sonst der erste vorhandene. */
function activeContract(contracts: Contract[]): Contract | null {
  return (
    contracts.find((c) => c.status === "active") ?? contracts[0] ?? null
  );
}

export function ClientDetail({
  client,
  projects,
  tasks,
  reportingCalls,
  interactions,
  checklists,
  files,
  contracts,
  users,
}: {
  client: ClientWithStats;
  projects: Project[];
  tasks: TaskWithRelations[];
  reportingCalls: ReportingCallWithRelations[];
  interactions: ClientInteraction[];
  checklists: ClientChecklist[];
  files: FileRecord[];
  contracts: Contract[];
  users: ProfileMini[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("overview");
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function startOnboarding() {
    startTransition(async () => {
      await startOnboardingAction(client.id);
      router.refresh();
    });
  }

  function startOffboarding() {
    startTransition(async () => {
      await createChecklistAction(client.id, "offboarding");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <Link
        href="/clients/list"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurueck zu Kunden
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
              {client.name}
            </h1>
            <StatusBadge
              label={statusLabel("client", client.status)}
              color={STATUS_COLOR(client.status)}
            />
            <span className="text-sm font-medium text-neutral-500">
              MRR {formatCHF(client.mrr)}
            </span>
          </div>
          <ClientWarnings warnings={client.warnings} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
            onClick={startOnboarding}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="h-4 w-4" />
            )}
            Onboarding starten
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={startOffboarding}
            disabled={pending}
          >
            <LogOut className="h-4 w-4" />
            Offboarding
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
            {t.key === "projects" && projects.length > 0
              ? ` (${projects.length})`
              : ""}
            {t.key === "tasks" && tasks.length > 0 ? ` (${tasks.length})` : ""}
            {t.key === "reporting" && reportingCalls.length > 0
              ? ` (${reportingCalls.length})`
              : ""}
            {t.key === "activity" && interactions.length > 0
              ? ` (${interactions.length})`
              : ""}
          </button>
        ))}
      </nav>

      <Card>
        <CardContent className="p-5 sm:p-6">
          {tab === "overview" ? (
            <OverviewTab
              client={client}
              contracts={contracts}
              checklists={checklists}
            />
          ) : tab === "projects" ? (
            <ProjectsTab projects={projects} />
          ) : tab === "tasks" ? (
            <TasksTab clientId={client.id} tasks={tasks} />
          ) : tab === "reporting" ? (
            <ReportingTab
              clientId={client.id}
              calls={reportingCalls}
              users={users}
            />
          ) : tab === "files" ? (
            <FilesTab files={files} />
          ) : tab === "invoices" ? (
            <EmptyState
              title="Rechnungen"
              description="Finance-Integration folgt."
            />
          ) : (
            <ActivityTab clientId={client.id} interactions={interactions} />
          )}
        </CardContent>
      </Card>

      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Kunde bearbeiten"
        size="lg"
      >
        <ClientForm
          mode="edit"
          clientId={client.id}
          users={users}
          initial={{
            name: client.name,
            package: client.package,
            status: client.status,
            account_manager_id: client.account_manager_id,
            email: client.email,
            phone: client.phone,
            website: client.website,
            industry: client.industry,
            city: client.city,
            country: client.country,
            company_type: client.company_type,
            start_date: client.start_date,
            notes: client.notes,
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

/** Catalog-Farbe fuer einen Client-Status (fuer StatusBadge). */
function STATUS_COLOR(status: string): string | undefined {
  const map: Record<string, string> = {
    active: "green",
    onboarding: "blue",
    paused: "amber",
    ended: "gray",
  };
  return map[status];
}

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
  client,
  contracts,
  checklists,
}: {
  client: ClientWithStats;
  contracts: Contract[];
  checklists: ClientChecklist[];
}) {
  const contract = activeContract(contracts);
  const laufzeit =
    contract && (contract.start_date || contract.end_date)
      ? `${contract.start_date ? formatDate(contract.start_date) : "?"} – ${
          contract.end_date ? formatDate(contract.end_date) : "offen"
        }`
      : "-";

  return (
    <div className="space-y-6">
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Kunde">{client.name}</Field>
        <Field label="E-Mail">
          {client.email ? (
            <a
              href={`mailto:${client.email}`}
              className="text-brand-700 hover:underline"
            >
              {client.email}
            </a>
          ) : (
            "-"
          )}
        </Field>
        <Field label="Telefon">
          {client.phone ? (
            <a
              href={`tel:${client.phone}`}
              className="text-brand-700 hover:underline"
            >
              {client.phone}
            </a>
          ) : (
            "-"
          )}
        </Field>
        <Field label="Website">
          {client.website ? (
            <a
              href={client.website}
              target="_blank"
              rel="noreferrer"
              className="text-brand-700 hover:underline"
            >
              {client.website}
            </a>
          ) : (
            "-"
          )}
        </Field>
        <Field label="Paket">
          {client.package
            ? (CLIENT_PACKAGE_LABELS[
                client.package as keyof typeof CLIENT_PACKAGE_LABELS
              ] ?? client.package)
            : "-"}
        </Field>
        <Field label="MRR">{formatCHF(client.mrr)}</Field>
        <Field label="Vertragsstatus">
          {contract ? (
            <StatusBadge label={statusLabel("contract", contract.status)} />
          ) : (
            "-"
          )}
        </Field>
        <Field label="Startdatum">
          {client.start_date ? formatDate(client.start_date) : "-"}
        </Field>
        <Field label="Laufzeit">{laufzeit}</Field>
        <Field label="Letzte Aktivitaet">
          {client.last_contact ? formatDate(client.last_contact) : "-"}
        </Field>
        <Field label="Account Manager">
          {client.account_manager?.full_name ?? "-"}
        </Field>
        <Field label="Naechster Reporting-Call">
          {client.next_reporting ? formatDate(client.next_reporting) : "-"}
        </Field>
      </dl>

      {client.notes ? (
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            Notizen
          </dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
            {client.notes}
          </dd>
        </div>
      ) : null}

      {checklists.length > 0 ? (
        <div className="space-y-4">
          {checklists.map((cl) => (
            <ChecklistCard key={cl.id} clientId={client.id} checklist={cl} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ChecklistCard({
  clientId,
  checklist,
}: {
  clientId: string;
  checklist: ClientChecklist;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const items = checklist.items ?? [];
  const done = items.filter((i) => i.completed).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  function toggle(item: ClientChecklistItem) {
    startTransition(async () => {
      await toggleChecklistItemAction(item.id, !item.completed, clientId);
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-neutral-800">
          {CHECKLIST_LABELS[checklist.kind] ?? checklist.kind}
        </h3>
        <span className="text-xs font-medium text-neutral-500">
          {done}/{total} ({pct}%)
        </span>
      </div>
      <div
        className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-brand-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      {items.length === 0 ? (
        <p className="text-sm italic text-neutral-400">Keine Punkte.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item.id}>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={item.completed}
                  disabled={pending}
                  onChange={() => toggle(item)}
                  className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-200"
                />
                <span
                  className={cn(
                    item.completed && "text-neutral-400 line-through",
                  )}
                >
                  {item.title}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProjectsTab({ projects }: { projects: Project[] }) {
  if (projects.length === 0) {
    return (
      <EmptyState
        title="Keine Projekte"
        description="Fuer diesen Kunden wurde noch kein Projekt angelegt."
      />
    );
  }
  return (
    <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
      {projects.map((p) => (
        <li
          key={p.id}
          className="flex items-center justify-between gap-3 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-neutral-800">
              {p.title}
            </p>
            <p className="text-xs text-neutral-500">{p.project_type}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <StatusBadge label={statusLabel("project", p.status)} />
            <span className="text-sm text-neutral-500">
              {p.due_date ? formatDate(p.due_date) : "-"}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function TasksTab({
  clientId,
  tasks,
}: {
  clientId: string;
  tasks: TaskWithRelations[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <QuickCreate initial={{ client_id: clientId }} label="Aufgabe" />
      </div>
      {tasks.length === 0 ? (
        <EmptyState
          title="Keine Aufgaben"
          description="Lege eine Aufgabe an, damit dieser Kunde aktiv betreut wird."
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

function ReportingTab({
  clientId,
  calls,
  users,
}: {
  clientId: string;
  calls: ReportingCallWithRelations[];
  users: ProfileMini[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setStatus(id: string, statusKey: string) {
    startTransition(async () => {
      await markReportingCallStatusAction(id, statusKey);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ReportingCallQuickCreate clientId={clientId} />
      </div>
      {calls.length === 0 ? (
        <EmptyState
          title="Keine Reporting-Calls"
          description="Plane einen Reporting-Call, um die Kundenbeziehung aktiv zu fuehren."
        />
      ) : (
        <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
          {calls.map((rc) => (
            <li
              key={rc.id}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="text-sm font-medium text-neutral-800">
                  {rc.scheduled_date ? formatDate(rc.scheduled_date) : "Offen"}
                </span>
                <StatusBadge
                  label={statusLabel("reporting_call", rc.status)}
                />
                {rc.owner?.full_name ? (
                  <span className="truncate text-sm text-neutral-500">
                    {rc.owner.full_name}
                  </span>
                ) : null}
              </div>
              <select
                value={rc.status}
                onChange={(e) => setStatus(rc.id, e.target.value)}
                disabled={pending}
                aria-label="Reporting-Call-Status aendern"
                className="h-9 shrink-0 rounded-lg border border-neutral-300 bg-white px-2.5 text-sm font-medium focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                {REPORTING_CALL_STATUSES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilesTab({ files }: { files: FileRecord[] }) {
  if (files.length === 0) {
    return (
      <EmptyState
        title="Keine Dateien"
        description="Datei-Upload via Storage folgt."
      />
    );
  }
  return (
    <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
      {files.map((f) => (
        <li
          key={f.id}
          className="flex items-center justify-between gap-3 px-4 py-3"
        >
          {f.file_url ? (
            <a
              href={f.file_url}
              target="_blank"
              rel="noreferrer"
              className="truncate text-sm font-medium text-neutral-800 hover:text-brand-700"
            >
              {f.filename}
            </a>
          ) : (
            <span className="truncate text-sm font-medium text-neutral-800">
              {f.filename}
            </span>
          )}
          <span className="shrink-0 text-xs text-neutral-500">
            {f.category ?? "-"}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ActivityTab({
  clientId,
  interactions,
}: {
  clientId: string;
  interactions: ClientInteraction[];
}) {
  const router = useRouter();
  const [type, setType] = useState<ClientInteractionType>(
    CLIENT_INTERACTION_TYPES[0].key,
  );
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const r = await createClientInteractionAction({
        client_id: clientId,
        type,
        subject: subject.trim() || undefined,
        body: body.trim() || undefined,
      });
      if (r.ok) {
        setSubject("");
        setBody("");
        setType(CLIENT_INTERACTION_TYPES[0].key);
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
              onChange={(e) => setType(e.target.value as ClientInteractionType)}
              className={inputClass}
            >
              {CLIENT_INTERACTION_TYPES.map((t) => (
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
              placeholder="z.B. Reporting-Call durchgefuehrt"
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
                Kontakt erfassen
              </>
            )}
          </Button>
        </div>
      </form>

      {interactions.length === 0 ? (
        <EmptyState
          title="Noch keine Aktivitaet"
          description="Erfasse Calls, Meetings, E-Mails oder Notizen, um den Kontaktverlauf festzuhalten."
        />
      ) : (
        <ol className="relative space-y-4 border-l border-neutral-200 pl-5">
          {interactions.map((it) => (
            <li key={it.id} className="relative">
              <span
                aria-hidden="true"
                className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-500"
              />
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  label={
                    CLIENT_INTERACTION_TYPE_LABELS[
                      it.type as keyof typeof CLIENT_INTERACTION_TYPE_LABELS
                    ] ?? it.type
                  }
                  color="blue"
                />
                {it.subject ? (
                  <span className="text-sm font-medium text-neutral-900">
                    {it.subject}
                  </span>
                ) : null}
              </div>
              {it.body ? (
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
                  {it.body}
                </p>
              ) : null}
              <p className="mt-1 text-xs text-neutral-400">
                {formatDate(it.interaction_date)}
                {it.author?.full_name ? ` · ${it.author.full_name}` : ""}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
