import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { TasksNav } from "@/components/tasks/tasks-nav";

export default async function TasksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Aufgaben"
        title="Aufgaben"
        description="Das zentrale Operations-System - Board, Tabelle und Tagesansichten."
      />
      <TasksNav />
      <div>{children}</div>
    </div>
  );
}
