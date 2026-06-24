import { notFound } from "next/navigation";
import {
  creatorsService,
  shootAssignmentsService,
  creatorRatingsService,
  creatorAvailabilityService,
  creatorAssetsService,
} from "@/server/services";
import { creatorFormOptionsAction } from "@/app/(app)/production/creators/actions";
import { CreatorDetail } from "@/components/creators/creator-detail";

export default async function CreatorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const creator = await creatorsService.getWithStats(id).catch(() => null);
  if (!creator) notFound();

  const [assignments, ratings, availability, portfolio, options] =
    await Promise.all([
      shootAssignmentsService.listByCreator(id).catch(() => []),
      creatorRatingsService.listByCreator(id).catch(() => []),
      creatorAvailabilityService.listByCreator(id).catch(() => []),
      creatorAssetsService.listByCreator(id).catch(() => []),
      creatorFormOptionsAction().catch(
        () => ({ ok: false as const, error: "" }),
      ),
    ]);

  const shoots = (options.ok && options.data ? options.data.shoots : []).map(
    (s) => ({ id: s.id, title: s.title }),
  );

  return (
    <CreatorDetail
      creator={creator}
      assignments={assignments}
      ratings={ratings}
      availability={availability}
      portfolio={portfolio}
      shoots={shoots}
    />
  );
}
