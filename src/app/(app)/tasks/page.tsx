import type { Metadata } from "next";
import { tasksService } from "@/server/services";
import { TaskBoard } from "@/components/tasks/task-board";
import type { TaskWithRelations } from "@/types/entities";

export const metadata: Metadata = { title: "Aufgaben - Board" };

export default async function TasksBoardPage() {
  let tasks: TaskWithRelations[] = [];
  try {
    tasks = await tasksService.board();
  } catch {
    tasks = [];
  }
  return <TaskBoard tasks={tasks} />;
}
