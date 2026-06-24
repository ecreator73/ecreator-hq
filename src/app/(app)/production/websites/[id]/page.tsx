import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  websiteProjectsService,
  tasksService,
  filesService,
  projectMilestonesService,
} from "@/server/services";
import type {
  TaskWithRelations,
  FileRecord,
  ProjectMilestone,
} from "@/types/entities";
import { WebsiteDetail } from "@/components/production/website-detail";

export const metadata: Metadata = { title: "Production - Website" };

export default async function WebsiteProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const item = await websiteProjectsService.getById(id).catch(() => null);
  if (!item) notFound();

  const [tasks, files, milestones] = await Promise.all([
    item.client_id
      ? tasksService
          .list({ client_id: item.client_id })
          .then((r) => r.rows)
          .catch(() => [] as TaskWithRelations[])
      : Promise.resolve([] as TaskWithRelations[]),
    item.client_id
      ? filesService
          .list({ filter: { client_id: item.client_id } })
          .catch(() => [] as FileRecord[])
      : Promise.resolve([] as FileRecord[]),
    item.project_id
      ? projectMilestonesService
          .listByProject(item.project_id)
          .catch(() => [] as ProjectMilestone[])
      : Promise.resolve([] as ProjectMilestone[]),
  ]);

  return (
    <WebsiteDetail
      item={item}
      tasks={tasks}
      files={files}
      milestones={milestones}
    />
  );
}
