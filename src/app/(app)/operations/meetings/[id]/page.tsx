import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MeetingDetail } from "@/components/knowledge/meeting-detail";
import { meetingAssistantService } from "@/server/services";

export const metadata: Metadata = { title: "Operations - Meeting" };

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const meeting = await meetingAssistantService.getById(id).catch(() => null);
  if (!meeting) notFound();

  return <MeetingDetail meeting={meeting} />;
}
