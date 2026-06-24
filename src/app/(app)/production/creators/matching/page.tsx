import { PageHeader } from "@/components/page-header";
import { CreatorMatching } from "@/components/creators/creator-matching";
import { creatorFormOptionsAction } from "@/app/(app)/production/creators/actions";

export default async function CreatorMatchingPage() {
  const opt = await creatorFormOptionsAction().catch(
    () => ({ ok: false }) as const,
  );
  const shoots = opt.ok && opt.data ? opt.data.shoots : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shooting-Matching"
        description="Kriterien angeben - das System schlaegt passende Creator vor und du kannst sie direkt fuer ein Shooting anfragen."
      />
      <CreatorMatching shoots={shoots} />
    </div>
  );
}
