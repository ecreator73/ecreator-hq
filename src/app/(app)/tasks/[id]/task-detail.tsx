"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Pencil, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PriorityBadge } from "@/components/tasks/status-badge";
import { TaskForm } from "@/components/tasks/task-form";
import { SubtaskList } from "@/components/tasks/subtask-list";
import { CommentSection } from "@/components/tasks/comment-section";
import { TASK_STATUSES, type TaskStatus } from "@/config/catalog";
import {
  updateTaskAction,
  deleteTaskAction,
  type TaskFormOptions,
} from "@/app/(app)/tasks/actions";
import { formatDate, cn } from "@/lib/utils";
import type {
  TaskWithRelations,
  Subtask,
  TaskComment,
  TaskActivity,
} from "@/types/entities";

const TABS = [
  { key: "overview", label: "Uebersicht" },
  { key: "comments", label: "Kommentare" },
  { key: "files", label: "Dateien" },
  { key: "activity", label: "Aktivitaet" },
  { key: "subtasks", label: "Subtasks" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const ACTION_LABELS: Record<string, string> = {
  created: "Aufgabe erstellt",
  status_changed: "Status geaendert",
  assigned: "Verantwortlichen geaendert",
  updated: "aktualisiert",
  deleted: "geloescht",
};

const selectClass =
  "h-9 rounded-lg border border-neutral-300 bg-white px-2.5 text-sm font-medium focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export function TaskDetail({
  task,
  subtasks,
  comments,
  activity,
  options,
}: {
  task: TaskWithRelations;
  subtasks: Subtask[];
  comments: TaskComment[];
  activity: TaskActivity[];
  options: TaskFormOptions;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("overview");
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function changeStatus(statusKey: string) {
    startTransition(async () => {
      await updateTaskAction(task.id, { status: statusKey as TaskStatus });
      router.refresh();
    });
  }

  function remove() {
    if (!window.confirm("Aufgabe wirklich loeschen?")) return;
    startTransition(async () => {
      const r = await deleteTaskAction(task.id);
      if (r.ok) router.push("/tasks");
    });
  }

  return (
    <div className="space-y-5">
      <Link
        href="/tasks"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurueck zu Aufgaben
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
          {task.title}
        </h1>
        <div className="flex items-center gap-2">
          <select
            value={task.status?.key ?? "open"}
            onChange={(e) => changeStatus(e.target.value)}
            disabled={pending}
            className={selectClass}
          >
            {TASK_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" />
            Bearbeiten
          </Button>
          <Button variant="danger" size="sm" onClick={remove} disabled={pending}>
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
            {t.key === "comments" && comments.length > 0
              ? ` (${comments.length})`
              : ""}
            {t.key === "subtasks" && subtasks.length > 0
              ? ` (${subtasks.length})`
              : ""}
          </button>
        ))}
      </nav>

      <Card>
        <CardContent className="p-5 sm:p-6">
          {tab === "overview" ? (
            <OverviewTab task={task} />
          ) : tab === "comments" ? (
            <CommentSection taskId={task.id} comments={comments} />
          ) : tab === "files" ? (
            <EmptyState
              title="Noch keine Dateien"
              description="Datei-Anhaenge nutzen die Tabellen files/task_files; der Upload via Supabase Storage folgt mit dem Operations-/Dateien-Modul."
            />
          ) : tab === "activity" ? (
            <ActivityTab activity={activity} />
          ) : (
            <SubtaskList taskId={task.id} subtasks={subtasks} />
          )}
        </CardContent>
      </Card>

      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Aufgabe bearbeiten"
        size="lg"
      >
        <TaskForm
          mode="edit"
          taskId={task.id}
          options={options}
          initial={{
            title: task.title,
            description: task.description,
            status: task.status?.key,
            priority: task.priority?.key,
            assigned_to: task.assigned_to,
            client_id: task.client_id,
            project_id: task.project_id,
            due_date: task.due_date,
            start_date: task.start_date,
            estimated_hours: task.estimated_hours,
            tags: task.tags,
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

function OverviewTab({ task }: { task: TaskWithRelations }) {
  return (
    <div className="space-y-5">
      {task.description ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
          {task.description}
        </p>
      ) : (
        <p className="text-sm italic text-neutral-400">Keine Beschreibung.</p>
      )}

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Prioritaet">
          <PriorityBadge label={task.priority?.label} color={task.priority?.color} />
        </Field>
        <Field label="Kunde">{task.client?.name ?? "-"}</Field>
        <Field label="Projekt">{task.project?.title ?? "-"}</Field>
        <Field label="Verantwortlich">
          {task.assignee ? (
            <span className="inline-flex items-center gap-1.5">
              <Avatar name={task.assignee.full_name ?? "?"} className="h-6 w-6 text-[10px]" />
              {task.assignee.full_name}
            </span>
          ) : (
            "-"
          )}
        </Field>
        <Field label="Faellig am">
          {task.due_date ? formatDate(task.due_date) : "-"}
        </Field>
        <Field label="Startdatum">
          {task.start_date ? formatDate(task.start_date) : "-"}
        </Field>
        <Field label="Geschaetzte Stunden">
          {task.estimated_hours ?? "-"}
        </Field>
        <Field label="Tatsaechliche Stunden">{task.actual_hours ?? "-"}</Field>
        <Field label="Tags">
          {task.tags.length > 0 ? (
            <span className="flex flex-wrap gap-1">
              {task.tags.map((tag) => (
                <Badge key={tag} tone="neutral">
                  {tag}
                </Badge>
              ))}
            </span>
          ) : (
            "-"
          )}
        </Field>
      </dl>
    </div>
  );
}

function ActivityTab({ activity }: { activity: TaskActivity[] }) {
  if (activity.length === 0) {
    return <EmptyState title="Keine Aktivitaet" />;
  }
  return (
    <ul className="space-y-3">
      {activity.map((a) => (
        <li key={a.id} className="flex gap-3 text-sm">
          <Avatar name={a.actor?.full_name ?? "?"} className="h-7 w-7 shrink-0 text-[10px]" />
          <div>
            <p className="text-neutral-700">
              <span className="font-medium text-neutral-900">
                {a.actor?.full_name ?? "System"}
              </span>{" "}
              {ACTION_LABELS[a.action] ?? a.action}
              {a.old_value || a.new_value ? (
                <span className="text-neutral-500">
                  {" "}
                  {a.old_value ?? "-"} → {a.new_value ?? "-"}
                </span>
              ) : null}
            </p>
            <p className="text-xs text-neutral-400">{formatDate(a.created_at)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
