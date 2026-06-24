import type { Metadata } from "next";
import { tasksService } from "@/server/services";
import type { TaskFilters } from "@/server/services";
import { TaskList } from "@/components/tasks/task-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { today } from "@/lib/dates";
import type { TaskWithRelations } from "@/types/entities";

export const metadata: Metadata = { title: "Aufgaben - Heute" };

async function rows(filters: TaskFilters): Promise<TaskWithRelations[]> {
  try {
    return (await tasksService.list(filters, { pageSize: 200 })).rows;
  } catch {
    return [];
  }
}

export default async function TasksTodayPage() {
  const t = today();
  const [overdue, due] = await Promise.all([
    rows({ overdue: true, excludeStatus: ["done", "archived"] }),
    rows({ dueFrom: t, dueTo: t, excludeStatus: ["done", "archived"] }),
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">
            Ueberfaellig ({overdue.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TaskList
            tasks={overdue}
            emptyTitle="Nichts ueberfaellig"
            emptyDescription="Sehr gut - keine ueberfaelligen Aufgaben."
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Heute faellig ({due.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskList
            tasks={due}
            emptyTitle="Heute nichts faellig"
            emptyDescription="Fuer heute stehen keine faelligen Aufgaben an."
          />
        </CardContent>
      </Card>
    </div>
  );
}
