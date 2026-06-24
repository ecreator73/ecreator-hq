import { notFound } from "next/navigation";
import {
  tasksService,
  subtasksService,
  taskCommentsService,
  taskActivityService,
} from "@/server/services";
import { taskFormOptionsAction } from "@/app/(app)/tasks/actions";
import { TaskDetail } from "./task-detail";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const task = await tasksService.getById(id).catch(() => null);
  if (!task) notFound();

  const [subtasks, comments, activity, optRes] = await Promise.all([
    subtasksService.listByTask(id).catch(() => []),
    taskCommentsService.listByTask(id).catch(() => []),
    taskActivityService.listByTask(id).catch(() => []),
    taskFormOptionsAction(),
  ]);

  const options =
    optRes.ok && optRes.data
      ? optRes.data
      : { clients: [], projects: [], users: [] };

  return (
    <TaskDetail
      task={task}
      subtasks={subtasks}
      comments={comments}
      activity={activity}
      options={options}
    />
  );
}
