import Link from "next/link";
import { CheckSquare, MessageSquare, CalendarDays } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { PriorityBadge } from "@/components/tasks/status-badge";
import { formatDate, cn } from "@/lib/utils";
import type { TaskWithRelations } from "@/types/entities";

function isOverdue(task: TaskWithRelations): boolean {
  if (!task.due_date) return false;
  if (task.status?.key === "done" || task.status?.key === "archived") return false;
  return task.due_date < new Date().toISOString().slice(0, 10);
}

export function TaskCard({ task }: { task: TaskWithRelations }) {
  const overdue = isOverdue(task);
  return (
    <Link
      href={`/tasks/${task.id}`}
      draggable={false}
      className="block rounded-lg border border-neutral-200 bg-white p-3 shadow-sm transition-colors hover:border-brand-300"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug text-neutral-900">
          {task.title}
        </p>
      </div>

      {task.client || task.project ? (
        <p className="mt-1 truncate text-xs text-neutral-500">
          {[task.client?.name, task.project?.title].filter(Boolean).join(" · ")}
        </p>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-2">
        <PriorityBadge
          label={task.priority?.label}
          color={task.priority?.color}
        />
        {task.assignee ? (
          <Avatar
            name={task.assignee.full_name ?? "?"}
            className="h-6 w-6 text-[10px]"
          />
        ) : null}
      </div>

      {(task.due_date ||
        task.subtask_total > 0 ||
        task.comment_count > 0) && (
        <div className="mt-2 flex items-center gap-3 text-xs text-neutral-400">
          {task.due_date ? (
            <span
              className={cn(
                "inline-flex items-center gap-1",
                overdue && "font-medium text-red-600",
              )}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(task.due_date)}
            </span>
          ) : null}
          {task.subtask_total > 0 ? (
            <span className="inline-flex items-center gap-1">
              <CheckSquare className="h-3.5 w-3.5" />
              {task.subtask_done}/{task.subtask_total}
            </span>
          ) : null}
          {task.comment_count > 0 ? (
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              {task.comment_count}
            </span>
          ) : null}
        </div>
      )}
    </Link>
  );
}
