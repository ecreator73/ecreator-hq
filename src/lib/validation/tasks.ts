import { z } from "zod";
import * as f from "./common";
import { TASK_STATUS_KEYS, PRIORITY_KEYS } from "@/config/catalog";

/**
 * Hinweis: Eingaben arbeiten mit Status-/Prioritaets-*Keys* (z.B. "open",
 * "urgent"). Der Service loest sie in `status_id`/`priority_id` (FK in die
 * Registry) auf.
 */
export const taskInsertSchema = z.object({
  title: f.requiredText(300),
  description: f.optionalText(),
  client_id: f.optionalUuid,
  project_id: f.optionalUuid,
  lead_id: f.optionalUuid,
  assigned_to: f.optionalUuid,
  status: z.enum(TASK_STATUS_KEYS).optional(),
  priority: z.enum(PRIORITY_KEYS).optional(),
  due_date: f.optionalDate,
  start_date: f.optionalDate,
  estimated_hours: f.optionalHours,
  actual_hours: f.optionalHours,
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
});

export const taskUpdateSchema = taskInsertSchema.partial();

/** Board-Drag&Drop: Status wechseln + neue Position. */
export const taskMoveSchema = z.object({
  status: z.enum(TASK_STATUS_KEYS),
  position: z.number(),
});

export const subtaskInsertSchema = z.object({
  task_id: f.uuid,
  title: f.requiredText(300),
  order_index: z.number().int().min(0).optional(),
});

export const subtaskUpdateSchema = z.object({
  title: f.requiredText(300).optional(),
  completed: z.boolean().optional(),
  order_index: z.number().int().min(0).optional(),
});

export const commentInsertSchema = z.object({
  task_id: f.uuid,
  comment: f.requiredText(5000),
});

export type TaskCreateInput = z.input<typeof taskInsertSchema>;
export type TaskUpdateInput = z.input<typeof taskUpdateSchema>;
export type TaskMoveInput = z.input<typeof taskMoveSchema>;
export type SubtaskCreateInput = z.input<typeof subtaskInsertSchema>;
export type SubtaskUpdateInput = z.input<typeof subtaskUpdateSchema>;
export type CommentCreateInput = z.input<typeof commentInsertSchema>;
