"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  tasksService,
  subtasksService,
  taskCommentsService,
  taskTemplatesService,
  notificationsService,
  clientsService,
  projectsService,
  teamService,
} from "@/server/services";
import type {
  TaskCreateInput,
  TaskUpdateInput,
  TaskMoveInput,
} from "@/lib/validation/tasks";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function fail(e: unknown): { ok: false; error: string } {
  const message =
    e instanceof Error ? e.message : "Ein unbekannter Fehler ist aufgetreten.";
  return { ok: false, error: message };
}

function revalidateTasks(taskId?: string) {
  revalidatePath("/tasks", "layout");
  revalidatePath("/");
  if (taskId) revalidatePath(`/tasks/${taskId}`);
}

export async function createTaskAction(
  input: TaskCreateInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireUser();
    const task = await tasksService.create(input);
    revalidateTasks();
    return { ok: true, data: { id: task.id } };
  } catch (e) {
    return fail(e);
  }
}

export async function updateTaskAction(
  id: string,
  input: TaskUpdateInput,
): Promise<ActionResult> {
  try {
    await requireUser();
    await tasksService.update(id, input);
    revalidateTasks(id);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteTaskAction(id: string): Promise<ActionResult> {
  try {
    await requireUser();
    await tasksService.remove(id);
    revalidateTasks();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function moveTaskAction(
  id: string,
  input: TaskMoveInput,
): Promise<ActionResult> {
  try {
    await requireUser();
    await tasksService.move(id, input);
    revalidateTasks(id);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function addSubtaskAction(
  taskId: string,
  title: string,
): Promise<ActionResult> {
  try {
    await requireUser();
    await subtasksService.create({ task_id: taskId, title });
    revalidateTasks(taskId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function toggleSubtaskAction(
  id: string,
  completed: boolean,
  taskId: string,
): Promise<ActionResult> {
  try {
    await requireUser();
    await subtasksService.toggle(id, completed);
    revalidateTasks(taskId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteSubtaskAction(
  id: string,
  taskId: string,
): Promise<ActionResult> {
  try {
    await requireUser();
    await subtasksService.remove(id);
    revalidateTasks(taskId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function addCommentAction(
  taskId: string,
  comment: string,
): Promise<ActionResult> {
  try {
    await requireUser();
    await taskCommentsService.create({ task_id: taskId, comment });
    revalidateTasks(taskId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function applyTemplateAction(
  templateId: string,
  opts: { project_id?: string | null; client_id?: string | null },
): Promise<ActionResult<{ created: number }>> {
  try {
    await requireUser();
    const created = await taskTemplatesService.apply(templateId, opts);
    revalidateTasks();
    return { ok: true, data: { created } };
  } catch (e) {
    return fail(e);
  }
}

export async function markNotificationReadAction(
  id: string,
): Promise<ActionResult> {
  try {
    await requireUser();
    await notificationsService.markRead(id);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await notificationsService.markAllRead(user.id);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export interface TaskFormOptions {
  clients: { id: string; name: string }[];
  projects: { id: string; title: string }[];
  users: { id: string; full_name: string | null }[];
}

/** Optionen fuer Dropdowns im Aufgaben-Formular (Quick Create / Bearbeiten). */
export async function taskFormOptionsAction(): Promise<
  ActionResult<TaskFormOptions>
> {
  try {
    await requireUser();
    const [clients, projects, users] = await Promise.all([
      clientsService
        .list()
        .then((r) => r.map((c) => ({ id: c.id, name: c.name })))
        .catch(() => []),
      projectsService
        .list()
        .then((r) => r.map((p) => ({ id: p.id, title: p.title })))
        .catch(() => []),
      teamService.listMembers().catch(() => []),
    ]);
    return { ok: true, data: { clients, projects, users } };
  } catch (e) {
    return fail(e);
  }
}
