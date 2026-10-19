import type { Metadata } from "next";
import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { LEADERSHIP_ROLES } from "@/config/navigation";
import { MarketingNav } from "@/components/marketing/marketing-nav";

export const metadata: Metadata = {
  title: { default: "Marketing", template: "%s · Marketing" },
  // Internes Dashboard: nie indexieren (zusaetzlich zum Login-Schutz).
  robots: { index: false, follow: false, nocache: true },
};

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  // Serverseitige Rollenpruefung fuer den gesamten Bereich (RLS sichert zusaetzlich die Daten).
  await requireRole(LEADERSHIP_ROLES);
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Marketing Intelligence</p>
        <p className="mt-0.5 text-sm text-neutral-500">Website, Werbung, Leads und Termine von www.ecreator.ch</p>
      </div>
      <Suspense fallback={<div className="h-[84px]" />}>
        <MarketingNav />
      </Suspense>
      <div>{children}</div>
    </div>
  );
}
