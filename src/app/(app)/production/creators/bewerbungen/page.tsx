import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { productionCrmService, type CreatorApplication } from "@/server/services/production-crm.service";
import { ApplicationsBoard } from "@/components/creators/applications-board";

export const metadata: Metadata = { title: "Creator-Bewerbungen" };

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireRole(["super_admin", "ceo", "cso", "project_manager", "creative"], "/production/creators");
  const { status } = await searchParams;
  const apps = await productionCrmService.applications().catch((): CreatorApplication[] => []);
  return <ApplicationsBoard applications={apps} initialStatus={status} />;
}
