import { notFound } from "next/navigation";
import {
  leadsService,
  salesActivitiesService,
  salesMeetingsService,
  tasksService,
  offersService,
} from "@/server/services";
import { salesFormOptionsAction } from "@/app/(app)/sales/actions";
import { LeadDetail } from "./lead-detail";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Unabhaengige Abrufe parallel.
  const [lead, activities, meetings, taskRes, offers, optRes] =
    await Promise.all([
      leadsService.getById(id).catch(() => null),
      salesActivitiesService.listByLead(id).catch(() => []),
      salesMeetingsService.listByLead(id).catch(() => []),
      tasksService
        .list({ lead_id: id })
        .then((r) => r.rows)
        .catch(() => []),
      offersService.list({ filter: { lead_id: id } }).catch(() => []),
      salesFormOptionsAction(),
    ]);
  if (!lead) notFound();

  const options =
    optRes.ok && optRes.data
      ? optRes.data
      : { clients: [], users: [], leads: [] };

  return (
    <LeadDetail
      lead={lead}
      activities={activities}
      meetings={meetings}
      tasks={taskRes}
      offers={offers}
      options={options}
    />
  );
}
