"use client";

import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/page-header";

/**
 * Operations-Kopfzeile, die sich an die aktive Sub-Sektion anpasst. Standard
 * ist die Knowledge Base; unter /operations/growth zeigt sie die Growth Engine
 * (Operations Center).
 */
export function OperationsHeader() {
  const pathname = usePathname();
  const isGrowth =
    pathname === "/operations/growth" || pathname.startsWith("/operations/growth/");

  if (isGrowth) {
    return (
      <PageHeader
        eyebrow="Operations · Command Center"
        title="Growth Engine"
        description="Vom Lead bis zur Verlaengerung in einem Funnel - Vorschlaege, Prioritaeten und die naechsten besten Schritte."
      />
    );
  }

  return (
    <PageHeader
      eyebrow="Operations"
      title="Knowledge Base"
      description="Meetings, SOPs, Wissen und Prompts zentral."
    />
  );
}
