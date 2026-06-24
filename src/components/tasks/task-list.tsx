import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, PriorityBadge } from "@/components/tasks/status-badge";
import { formatDate, cn } from "@/lib/utils";
import type { TaskWithRelations } from "@/types/entities";

function isOverdue(task: TaskWithRelations): boolean {
  if (!task.due_date) return false;
  if (task.status?.key === "done" || task.status?.key === "archived") return false;
  return task.due_date < new Date().toISOString().slice(0, 10);
}

/** Kompakte, lesbare Aufgabenliste (fuer Tages-/Wochen-/Meine-Ansichten). */
export function TaskList({
  tasks,
  emptyTitle = "Keine Aufgaben",
  emptyDescription,
}: {
  tasks: TaskWithRelations[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (tasks.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
      <table className="w-full min-w-[44rem] text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
            <th className="px-4 py-2.5 font-medium">Titel</th>
            <th className="px-4 py-2.5 font-medium">Kunde / Projekt</th>
            <th className="px-4 py-2.5 font-medium">Verantwortlich</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5 font-medium">Prioritaet</th>
            <th className="px-4 py-2.5 font-medium">Faellig</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {tasks.map((t) => (
            <tr key={t.id} className="hover:bg-neutral-50">
              <td className="px-4 py-2.5">
                <Link
                  href={`/tasks/${t.id}`}
                  className="font-medium text-neutral-900 hover:text-brand-700"
                >
                  {t.title}
                </Link>
              </td>
              <td className="px-4 py-2.5 text-neutral-500">
                {[t.client?.name, t.project?.title].filter(Boolean).join(" · ") ||
                  "-"}
              </td>
              <td className="px-4 py-2.5">
                {t.assignee ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Avatar
                      name={t.assignee.full_name ?? "?"}
                      className="h-6 w-6 text-[10px]"
                    />
                    <span className="text-neutral-600">
                      {t.assignee.full_name}
                    </span>
                  </span>
                ) : (
                  <span className="text-neutral-400">-</span>
                )}
              </td>
              <td className="px-4 py-2.5">
                <StatusBadge label={t.status?.label} color={t.status?.color} />
              </td>
              <td className="px-4 py-2.5">
                <PriorityBadge
                  label={t.priority?.label}
                  color={t.priority?.color}
                />
              </td>
              <td
                className={cn(
                  "px-4 py-2.5 text-neutral-600",
                  isOverdue(t) && "font-medium text-red-600",
                )}
              >
                {t.due_date ? formatDate(t.due_date) : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
