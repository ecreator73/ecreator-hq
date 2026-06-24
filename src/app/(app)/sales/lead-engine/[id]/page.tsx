import { notFound } from "next/navigation";
import {
  leadCompaniesService,
  leadOpportunitiesService,
} from "@/server/services";
import { CompanyDetail } from "@/components/lead-engine/company-detail";
import type { LeadOpportunity } from "@/types/entities";

export default async function LeadCompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const company = await leadCompaniesService.getWithStats(id).catch(() => null);
  if (!company) notFound();

  let opportunities: LeadOpportunity[] = [];
  try {
    opportunities = await leadOpportunitiesService.listByCompany(id);
  } catch {
    opportunities = [];
  }

  return <CompanyDetail company={company} opportunities={opportunities} />;
}
