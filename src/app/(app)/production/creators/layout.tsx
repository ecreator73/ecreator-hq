import { requireUser } from "@/lib/auth";
import { CreatorPoolNav } from "@/components/creators/creator-pool-nav";

export default async function CreatorPoolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
          Creator Pool
        </p>
        <p className="mt-0.5 text-sm text-neutral-500">
          Internes Talent-CRM
        </p>
      </div>
      <CreatorPoolNav />
      <div className="mt-5">{children}</div>
    </div>
  );
}
