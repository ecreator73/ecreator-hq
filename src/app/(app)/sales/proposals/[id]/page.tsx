import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { proposalsService } from "@/server/services";
import { ProposalDetail } from "@/components/proposals/proposal-detail";

export const metadata: Metadata = { title: "Vorschlag" };

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const proposal = await proposalsService.getDetail(id).catch(() => null);
  if (!proposal) notFound();

  return <ProposalDetail proposal={proposal} />;
}
