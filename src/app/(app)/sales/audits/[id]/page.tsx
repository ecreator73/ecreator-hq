import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { websiteAuditsService } from "@/server/services";
import { AuditDetail } from "@/components/audits/audit-detail";

export const metadata: Metadata = { title: "Website-Audit" };

export default async function AuditDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const audit = await websiteAuditsService.getDetail(id).catch(() => null);
  if (!audit) notFound();

  return <AuditDetail audit={audit} />;
}
