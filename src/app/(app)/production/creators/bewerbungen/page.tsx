import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { productionCrmService, type CreatorApplication } from "@/server/services/production-crm.service";
import { ApplicationsBoard } from "@/components/creators/applications-board";
import { signCreatorMedia } from "@/server/services/creator-media.service";

export const metadata: Metadata = { title: "Creator-Bewerbungen" };

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireRole(["super_admin", "ceo", "cso", "project_manager", "creative"], "/production/creators");
  const { status } = await searchParams;
  const apps = await productionCrmService.applications().catch((): CreatorApplication[] => []);
  // Nur offene Bewerbungen haben Medien (abgelehnte wurden nicht uebernommen)
  const media = await signCreatorMedia(apps.flatMap((a) => [a.photo_file, a.video_file])).catch(() => ({}) as Record<string, string>);
  return <ApplicationsBoard applications={apps} initialStatus={status} media={media} />;
}
