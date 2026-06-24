import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { adProjectsService, tasksService, filesService } from "@/server/services";
import type {
  AdProjectWithRelations,
  TaskWithRelations,
  FileRecord,
} from "@/types/entities";
import { AdDetail } from "@/components/production/ad-detail";

export const metadata: Metadata = { title: "Ad-Kampagne" };

export default async function AdProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const item: AdProjectWithRelations | null = await adProjectsService
    .getById(id)
    .catch(() => null);
  if (!item) notFound();

  const clientId = item.client_id;

  const [tasks, files] = await Promise.all([
    clientId
      ? tasksService
          .list({ client_id: clientId })
          .then((r) => r.rows)
          .catch((): TaskWithRelations[] => [])
      : Promise.resolve<TaskWithRelations[]>([]),
    clientId
      ? filesService
          .list({ filter: { client_id: clientId } })
          .catch((): FileRecord[] => [])
      : Promise.resolve<FileRecord[]>([]),
  ]);

  return <AdDetail item={item} tasks={tasks} files={files} />;
}
