import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  crmProjectsService,
  tasksService,
  filesService,
  projectMilestonesService,
} from "@/server/services";
import type {
  TaskWithRelations,
  FileRecord,
  ProjectMilestone,
} from "@/types/entities";
import { CrmDetail } from "@/components/production/crm-detail";

export const metadata: Metadata = { title: "CRM-Projekt" };

export default async function CrmProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const item = await crmProjectsService.getById(id).catch(() => null);
  if (!item) notFound();

  const [tasks, files, milestones] = await Promise.all([
    item.client_id
      ? tasksService
          .list({ client_id: item.client_id })
          .then((r) => r.rows)
          .catch((): TaskWithRelations[] => [])
      : Promise.resolve<TaskWithRelations[]>([]),
    item.client_id
      ? filesService
          .list({ filter: { client_id: item.client_id } })
          .catch((): FileRecord[] => [])
      : Promise.resolve<FileRecord[]>([]),
    item.project_id
      ? projectMilestonesService
          .listByProject(item.project_id)
          .catch((): ProjectMilestone[] => [])
      : Promise.resolve<ProjectMilestone[]>([]),
  ]);

  return (
    <CrmDetail item={item} tasks={tasks} files={files} milestones={milestones} />
  );
}
