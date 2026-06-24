import type { Metadata } from "next";
import { tasksService } from "@/server/services";
import type { TaskFilters } from "@/server/services";
import { TaskList } from "@/components/tasks/task-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { weekRange } from "@/lib/dates";
import type { TaskWithRelations } from "@/types/entities";

export const metadata: Metadata = { title: "Aufgaben - Diese Woche" };

async function rows(filters: TaskFilters): Promise<TaskWithRelations[]> {
  try {
    return (await tasksService.list(filters, { pageSize: 200 })).rows;
  } catch {
    return [];
  }
}

export default async function TasksWeekPage() {
  const thisW = weekRange(0);
  const nextW = weekRange(1);
  const [thisWeek, nextWeek] = await Promise.all([
    rows({ dueFrom: thisW.from, dueTo: thisW.to, excludeStatus: ["done", "archived"] }),
    rows({ dueFrom: nextW.from, dueTo: nextW.to, excludeStatus: ["done", "archived"] }),
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Diese Woche ({thisWeek.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskList tasks={thisWeek} emptyTitle="Diese Woche nichts faellig" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Naechste Woche ({nextWeek.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskList tasks={nextWeek} emptyTitle="Naechste Woche nichts faellig" />
        </CardContent>
      </Card>
    </div>
  );
}
