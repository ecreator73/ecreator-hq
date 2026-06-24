import { createCrudService } from "./_helpers";
import {
  meetingInsertSchema,
  meetingUpdateSchema,
  type MeetingCreateInput,
  type MeetingUpdateInput,
} from "@/lib/validation/meetings";
import type { Meeting } from "@/types/entities";

export const meetingsService = createCrudService<
  Meeting,
  MeetingCreateInput,
  MeetingUpdateInput
>({
  table: "meetings",
  entityType: "meeting",
  insertSchema: meetingInsertSchema,
  updateSchema: meetingUpdateSchema,
  createStampColumns: ["created_by", "updated_by"],
  updateStampColumns: ["updated_by"],
  label: (m) => m.title,
  defaultOrder: { column: "meeting_date", ascending: false },
});
