"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
  Pencil,
  Sparkles,
  Video,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import {
  MeetingForm,
  type MeetingFormOptions,
} from "@/components/knowledge/meeting-form";
import {
  MEETING_STATUSES,
  MEETING_TYPE_LABELS,
  statusLabel,
} from "@/config/catalog";
import {
  generateMeetingSummaryAction,
  generateMeetingTasksAction,
  meetingFormOptionsAction,
} from "@/app/(app)/operations/actions";
import { formatDate } from "@/lib/utils";
import type { MeetingWithRelations } from "@/types/entities";

function statusColor(status: string | null): string | undefined {
  return MEETING_STATUSES.find((s) => s.key === status)?.color;
}

export function MeetingDetail({ meeting }: { meeting: MeetingWithRelations }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [options, setOptions] = useState<MeetingFormOptions | null>(null);

  const [summaryPending, startSummary] = useTransition();
  const [tasksPending, startTasks] = useTransition();
  const [tasksInfo, setTasksInfo] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (editing && !options) {
      meetingFormOptionsAction().then((r) =>
        setOptions(r.ok && r.data ? r.data : { clients: [], leads: [] }),
      );
    }
  }, [editing, options]);

  function runSummary() {
    setActionError(null);
    startSummary(async () => {
      const r = await generateMeetingSummaryAction(meeting.id);
      if (r.ok) router.refresh();
      else setActionError(r.error);
    });
  }

  function runTasks() {
    setActionError(null);
    setTasksInfo(null);
    startTasks(async () => {
      const r = await generateMeetingTasksAction(meeting.id);
      if (r.ok) {
        const created = r.data?.created ?? 0;
        setTasksInfo(`${created} Aufgabe${created === 1 ? "" : "n"} erstellt.`);
        router.refresh();
      } else {
        setActionError(r.error);
      }
    });
  }

  const partner = meeting.client
    ? { kind: "Kunde", label: meeting.client.name }
    : meeting.lead
      ? { kind: "Lead", label: meeting.lead.company_name }
      : null;

  const todos = meeting.action_items ?? meeting.next_steps;

  return (
    <div className="space-y-5">
      <Link
        href="/operations/meetings"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurueck zu Meetings
      </Link>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
              {meeting.title}
            </h1>
            <StatusBadge
              label={statusLabel("meeting", meeting.status)}
              color={statusColor(meeting.status)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-500">
            {meeting.meeting_type ? (
              <span>
                {MEETING_TYPE_LABELS[
                  meeting.meeting_type as keyof typeof MEETING_TYPE_LABELS
                ] ?? meeting.meeting_type}
              </span>
            ) : null}
            {partner ? (
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                {partner.kind}: {partner.label}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-neutral-400">
                <Building2 className="h-4 w-4" />
                Kein Kunde / Lead
              </span>
            )}
            {meeting.meeting_date ? (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                {formatDate(meeting.meeting_date)}
              </span>
            ) : null}
            {meeting.recording_url ? (
              <a
                href={meeting.recording_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-brand-700 underline-offset-2 hover:underline"
              >
                <Video className="h-4 w-4" />
                Aufzeichnung
              </a>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" />
            Bearbeiten
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        Hinweis: Zusammenfassung und ToDos sind eine Vorschau - keine Live-AI in
        dieser Phase.
      </div>

      {actionError ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {actionError}
        </div>
      ) : null}

      {/* Transkript */}
      <Section icon={FileText} title="Transkript">
        {meeting.transcript && meeting.transcript.trim() ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-600">
            {meeting.transcript}
          </p>
        ) : (
          <EmptyState
            title="Kein Transkript"
            description="Fuege ein Transkript ueber 'Bearbeiten' hinzu."
          />
        )}
      </Section>

      {/* Zusammenfassung */}
      <Section
        icon={Sparkles}
        title="Zusammenfassung"
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={runSummary}
            disabled={summaryPending}
          >
            {summaryPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Zusammenfassung erstellen
          </Button>
        }
      >
        {meeting.summary && meeting.summary.trim() ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-600">
            {meeting.summary}
          </p>
        ) : (
          <EmptyState
            title="Keine Zusammenfassung"
            description="Erstelle eine Vorschau-Zusammenfassung aus den Meeting-Daten."
          />
        )}
      </Section>

      {/* Entscheidungen */}
      <Section icon={CheckCircle2} title="Entscheidungen">
        {meeting.decisions && meeting.decisions.trim() ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-600">
            {meeting.decisions}
          </p>
        ) : (
          <EmptyState
            title="Keine Entscheidungen erfasst"
            description="Hinterlege Entscheidungen ueber 'Bearbeiten'."
          />
        )}
      </Section>

      {/* Naechste Schritte / ToDos */}
      <Section
        icon={ClipboardList}
        title="Naechste Schritte / ToDos"
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={runTasks}
            disabled={tasksPending}
          >
            {tasksPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ClipboardList className="h-4 w-4" />
            )}
            Aufgaben erstellen
          </Button>
        }
      >
        {tasksInfo ? (
          <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            {tasksInfo}
          </div>
        ) : null}
        {todos && todos.trim() ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-600">
            {todos}
          </p>
        ) : (
          <EmptyState
            title="Keine naechsten Schritte"
            description="Hinterlege naechste Schritte ueber 'Bearbeiten'."
          />
        )}
      </Section>

      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Meeting bearbeiten"
        size="lg"
      >
        {options ? (
          <MeetingForm
            mode="edit"
            id={meeting.id}
            options={options}
            initial={{
              title: meeting.title,
              meeting_type: meeting.meeting_type,
              client_id: meeting.client_id,
              lead_id: meeting.lead_id,
              meeting_date: meeting.meeting_date,
              status: meeting.status,
              recording_url: meeting.recording_url,
              notes: meeting.notes,
              decisions: meeting.decisions,
              next_steps: meeting.next_steps,
            }}
            onCancel={() => setEditing(false)}
            onDone={() => {
              setEditing(false);
              router.refresh();
            }}
          />
        ) : (
          <div className="flex items-center justify-center py-10 text-neutral-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
      </Modal>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-900">
            <Icon className="h-4 w-4 text-neutral-400" />
            {title}
          </h2>
          {action}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
