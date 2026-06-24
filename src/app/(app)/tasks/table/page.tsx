import type { Metadata } from "next";
import { tasksService } from "@/server/services";
import { TaskTable } from "@/components/tasks/task-table";
import { taskFormOptionsAction } from "@/app/(app)/tasks/actions";
import type { TaskFilters } from "@/server/services";
import type { TaskWithRelations } from "@/types/entities";

export const metadata: Metadata = { title: "Aufgaben - Tabelle" };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

export default async function TasksTablePage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const filters: TaskFilters = {
    search: one(sp.search),
    status: one(sp.status),
    priority: one(sp.priority),
    client_id: one(sp.client),
    project_id: one(sp.project),
    assigned_to: one(sp.assignee),
  };
  const page = Math.max(1, Number(one(sp.page) ?? 1) || 1);
  const SORTABLE = ["title", "due_date", "created_at", "position"];
  const sortColRaw = one(sp.sort);
  const sortCol =
    sortColRaw && SORTABLE.includes(sortColRaw) ? sortColRaw : undefined;
  const sort = sortCol
    ? { column: sortCol, ascending: (one(sp.dir) ?? "asc") === "asc" }
    : undefined;

  let result = {
    rows: [] as TaskWithRelations[],
    total: 0,
    page,
    pageSize: 50,
  };
  try {
    result = await tasksService.list(filters, { page, sort });
  } catch {
    // Demo-Modus / keine DB -> leere Tabelle
  }

  const optRes = await taskFormOptionsAction();
  const options =
    optRes.ok && optRes.data
      ? optRes.data
      : { clients: [], projects: [], users: [] };

  return (
    <TaskTable
      rows={result.rows}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      options={options}
    />
  );
}
