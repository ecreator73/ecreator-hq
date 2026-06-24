import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  contentProjectsService,
  shootsService,
  tasksService,
  filesService,
} from "@/server/services";
import type {
  ShootWithRelations,
  TaskWithRelations,
  FileRecord,
} from "@/types/entities";
import { ContentDetail } from "@/components/production/content-detail";

export const metadata: Metadata = { title: "Content-Produktion" };

export default async function ContentProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const item = await contentProjectsService.getById(id).catch(() => null);
  if (!item) notFound();

  const [tasks, files, shoots] = await Promise.all([
    tasksService
      .list({ client_id: item.client_id ?? undefined })
      .then((r) => r.rows)
      .catch((): TaskWithRelations[] => []),
    item.client_id
      ? filesService
          .list({ filter: { client_id: item.client_id } })
          .catch((): FileRecord[] => [])
      : Promise.resolve<FileRecord[]>([]),
    shootsService
      .list({ contentProjectId: id })
      .catch((): ShootWithRelations[] => []),
  ]);

  return (
    <ContentDetail item={item} tasks={tasks} files={files} shoots={shoots} />
  );
}
