import type { Metadata } from "next";
import { tasksService } from "@/server/services";
import { TaskList } from "@/components/tasks/task-list";
import { tomorrow } from "@/lib/dates";
import type { TaskWithRelations } from "@/types/entities";

export const metadata: Metadata = { title: "Aufgaben - Morgen" };

export default async function TasksTomorrowPage() {
  const tm = tomorrow();
  let tasks: TaskWithRelations[] = [];
  try {
    tasks = (
      await tasksService.list(
        { dueFrom: tm, dueTo: tm, excludeStatus: ["done", "archived"] },
        { pageSize: 200 },
      )
    ).rows;
  } catch {
    tasks = [];
  }

  return (
    <TaskList
      tasks={tasks}
      emptyTitle="Morgen nichts faellig"
      emptyDescription="Fuer morgen sind keine Aufgaben geplant."
    />
  );
}
