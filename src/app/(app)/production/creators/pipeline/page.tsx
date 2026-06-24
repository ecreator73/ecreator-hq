import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { CreatorQuickCreate } from "@/components/creators/creator-quick-create";
import { CreatorPipeline } from "@/components/creators/creator-pipeline";
import { creatorsService } from "@/server/services";
import type { CreatorWithStats } from "@/types/entities";

export const metadata: Metadata = { title: "Creator Pool - Pipeline" };

export default async function CreatorPipelinePage() {
  const creators: CreatorWithStats[] = await creatorsService
    .listWithStats({})
    .catch(() => []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">
          Creator per Drag &amp; Drop zwischen den Phasen verschieben.
        </p>
        <CreatorQuickCreate />
      </div>

      {creators.length === 0 ? (
        <EmptyState
          title="Noch keine Creator"
          description="Lege deinen ersten Creator an, um ihn in der Pipeline zu verwalten."
          action={<CreatorQuickCreate />}
        />
      ) : (
        <CreatorPipeline creators={creators} />
      )}
    </div>
  );
}
