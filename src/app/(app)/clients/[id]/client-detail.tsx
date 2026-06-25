"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Rocket,
  LogOut,
  AlertTriangle,
  CircleDot,
  Wallet,
  FileSignature,
  UserRound,
  CalendarClock,
  CalendarCheck,
  Activity as ActivityIcon,
  ListChecks,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/tasks/status-badge";
import { QuickCreate } from "@/components/tasks/quick-create";
import { ClientForm } from "@/components/clients/client-form";
import { ReportingCallQuickCreate } from "@/components/clients/reporting-call-quick-create";
import {
  ProjectQuickCreate,
  FileQuickCreate,
  NoteQuickCreate,
} from "@/components/clients/detail-quick-creates";
import { statusLabel } from "@/config/catalog";
import {
  startOnboardingAction,
  createChecklistAction,
} from "@/app/(app)/clients/actions";
import { formatDate, formatCHF, cn } from "@/lib/utils";
import { statusColorOf, type TabKey } from "./detail-ui";
import { OverviewTab } from "./tabs/overview-tab";
import { ProjectsTab } from "./tabs/projects-tab";
import { TasksTab } from "./tabs/tasks-tab";
import { ReportingTab } from "./tabs/reporting-tab";
import { ContractsTab } from "./tabs/contracts-tab";
import { FilesTab } from "./tabs/files-tab";
import { FinanceTab } from "./tabs/finance-tab";
import { ActivityTab } from "./tabs/activity-tab";
import { NotesTab } from "./tabs/notes-tab";
import type {
  ClientWithStats,
  Project,
  TaskWithRelations,
  ReportingCallWithRelations,
  ClientInteraction,
  ClientChecklist,
  FileRecord,
  Contract,
  Contact,
  InvoiceWithClient,
  ProfileMini,
} from "@/types/entities";

const OPEN_TASK = (t: TaskWithRelations) =>
  t.status?.key !== "done" && t.status?.key !== "archived";

function activeContract(contracts: Contract[]): Contract | null {
  return contracts.find((c) => c.status === "active") ?? contracts[0] ?? null;
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
  contacts,
  invoices,
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
  contacts: Contact[];
  invoices: InvoiceWithClient[];
  users: ProfileMini[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("overview");
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  const openTasks = useMemo(() => tasks.filter(OPEN_TASK), [tasks]);
  const notes = useMemo(() => interactions.filter((i) => i.type === "note"), [interactions]);
  const contract = activeContract(contracts);
  const danger = client.warnings.filter((w) => w.severity === "danger");
  const otherWarnings = client.warnings.filter((w) => w.severity !== "danger");

  const TABS: { key: TabKey; label: string; count?: number }[] = [
    { key: "overview", label: "Uebersicht" },
    { key: "projects", label: "Projekte", count: projects.length },
    { key: "tasks", label: "Aufgaben", count: openTasks.length },
    { key: "reporting", label: "Reporting Calls", count: reportingCalls.length },
    { key: "contracts", label: "Verträge", count: contracts.length },
    { key: "files", label: "Dateien", count: files.length },
    { key: "finance", label: "Finanzen" },
    { key: "activity", label: "Aktivitaet" },
    { key: "notes", label: "Notizen", count: notes.length },
  ];

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
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Zurueck zu Kunden
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
              {client.name}
            </h1>
            <StatusBadge
              label={statusLabel("client", client.status)}
              color={statusColorOf("client", client.status)}
            />
          </div>
          <p className="text-sm text-neutral-500">
            {client.industry ? `${client.industry} · ` : ""}
            {client.account_manager?.full_name
              ? `Betreut von ${client.account_manager.full_name}`
              : "Kein Account Manager"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Bearbeiten
          </Button>
          <Button variant="secondary" size="sm" onClick={startOnboarding} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Rocket className="h-4 w-4" aria-hidden="true" />}
            Onboarding
          </Button>
          <Button variant="ghost" size="sm" onClick={startOffboarding} disabled={pending}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Offboarding
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard icon={CircleDot} label="Status" value={statusLabel("client", client.status)} tone={client.status === "active" ? "green" : client.status === "paused" ? "amber" : "neutral"} />
        <SummaryCard icon={Wallet} label="MRR" value={formatCHF(client.mrr)} tone="brand" />
        <SummaryCard icon={FileSignature} label="Vertragsstatus" value={contract ? statusLabel("contract", contract.status) : "—"} />
        <SummaryCard icon={UserRound} label="Account Manager" value={client.account_manager?.full_name ?? "—"} />
        <SummaryCard icon={CalendarCheck} label="Startdatum" value={client.start_date ? formatDate(client.start_date) : "—"} />
        <SummaryCard icon={CalendarClock} label="Naechster Reporting" value={client.next_reporting ? formatDate(client.next_reporting) : "—"} tone={client.next_reporting ? "neutral" : "amber"} />
        <SummaryCard icon={ActivityIcon} label="Letzte Aktivitaet" value={client.last_contact ? formatDate(client.last_contact) : "—"} />
        <SummaryCard icon={ListChecks} label="Offene Aufgaben" value={String(openTasks.length)} tone={openTasks.length >= 5 ? "amber" : "neutral"} />
      </div>

      {/* Customer Health */}
      {client.warnings.length > 0 ? (
        <div
          className={cn(
            "flex flex-wrap items-center gap-2 rounded-xl border px-4 py-3",
            danger.length > 0 ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50",
          )}
        >
          <AlertTriangle
            className={cn("h-4 w-4 shrink-0", danger.length > 0 ? "text-red-600" : "text-amber-600")}
            aria-hidden="true"
          />
          {[...danger, ...otherWarnings].map((w) => (
            <span
              key={w.type}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium",
                w.severity === "danger"
                  ? "bg-red-100 text-red-700"
                  : w.severity === "warn"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-neutral-100 text-neutral-600",
              )}
            >
              {w.label}
            </span>
          ))}
        </div>
      ) : null}

      {/* Quick Action Bar (immer sichtbar) */}
      <div className="sticky top-0 z-20 -mx-1 flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-white/95 px-2 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <span className="px-1 text-xs font-medium uppercase tracking-wide text-neutral-400">
          Schnellaktion
        </span>
        <QuickCreate initial={{ client_id: client.id }} label="Aufgabe" variant="secondary" />
        <ReportingCallQuickCreate clientId={client.id} label="Reporting Call" variant="secondary" />
        <ProjectQuickCreate clientId={client.id} users={users} />
        <FileQuickCreate clientId={client.id} />
        <NoteQuickCreate clientId={client.id} />
      </div>

      {/* Tabs */}
      <nav className="-mx-1 flex gap-1 overflow-x-auto border-b border-neutral-200 px-1" aria-label="Kunden-Tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              tab === t.key
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-neutral-500 hover:text-neutral-800",
            )}
          >
            {t.label}
            {typeof t.count === "number" && t.count > 0 ? (
              <span className="ml-1.5 rounded-full bg-neutral-100 px-1.5 py-0.5 text-xs tabular-nums text-neutral-500">
                {t.count}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {/* Panels */}
      <div>
        {tab === "overview" ? (
          <OverviewTab
            client={client}
            contract={contract}
            contracts={contracts}
            contacts={contacts}
            projects={projects}
            tasks={openTasks}
            interactions={interactions}
            checklists={checklists}
            onTab={setTab}
          />
        ) : tab === "projects" ? (
          <ProjectsTab clientId={client.id} projects={projects} users={users} />
        ) : tab === "tasks" ? (
          <TasksTab clientId={client.id} tasks={tasks} />
        ) : tab === "reporting" ? (
          <ReportingTab clientId={client.id} calls={reportingCalls} users={users} />
        ) : tab === "contracts" ? (
          <ContractsTab contracts={contracts} />
        ) : tab === "files" ? (
          <FilesTab clientId={client.id} files={files} />
        ) : tab === "finance" ? (
          <FinanceTab client={client} invoices={invoices} contracts={contracts} />
        ) : tab === "activity" ? (
          <ActivityTab
            interactions={interactions}
            reportingCalls={reportingCalls}
            tasks={tasks}
            contracts={contracts}
          />
        ) : (
          <NotesTab clientId={client.id} interactions={interactions} />
        )}
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Kunde bearbeiten" size="lg">
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

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "neutral" | "brand" | "green" | "amber";
}) {
  const toneCls =
    tone === "brand"
      ? "text-brand-700"
      : tone === "green"
        ? "text-green-700"
        : tone === "amber"
          ? "text-amber-700"
          : "text-neutral-900";
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3.5 shadow-sm">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </div>
      <p className={cn("mt-1 truncate text-base font-semibold tabular-nums", toneCls)} title={value}>
        {value}
      </p>
    </div>
  );
}
