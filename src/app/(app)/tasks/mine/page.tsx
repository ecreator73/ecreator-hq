import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { tasksService } from "@/server/services";
import { TaskList } from "@/components/tasks/task-list";
import type { TaskWithRelations } from "@/types/entities";

export const metadata: Metadata = { title: "Aufgaben - Meine" };

export default async function TasksMinePage() {
  const user = await requireUser();
  let tasks: TaskWithRelations[] = [];
  try {
    tasks = (
      await tasksService.list(
        { assigned_to: user.id, excludeStatus: ["archived"] },
        { pageSize: 200, sort: { column: "due_date", ascending: true } },
      )
    ).rows;
  } catch {
    tasks = [];
  }

  return (
    <TaskList
      tasks={tasks}
      emptyTitle="Keine Aufgaben"
      emptyDescription="Dir sind aktuell keine Aufgaben zugewiesen."
    />
  );
}
