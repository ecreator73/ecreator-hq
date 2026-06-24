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

  const lead = await leadsService.getById(id).catch(() => null);
  if (!lead) notFound();

  const [activities, meetings, taskRes, offers, optRes] = await Promise.all([
    salesActivitiesService.listByLead(id).catch(() => []),
    salesMeetingsService.listByLead(id).catch(() => []),
    tasksService
      .list({ lead_id: id })
      .then((r) => r.rows)
      .catch(() => []),
    offersService.list({ filter: { lead_id: id } }).catch(() => []),
    salesFormOptionsAction(),
  ]);

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
