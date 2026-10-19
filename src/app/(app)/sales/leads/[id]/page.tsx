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
import { LeadCallBar } from "@/components/leads/lead-call-bar";
import { loadLeadWork } from "@/server/services/lead-work.service";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Unabhaengige Abrufe parallel.
  const [lead, activities, meetings, taskRes, offers, optRes, work] =
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
      loadLeadWork().catch(() => null),
    ]);
  if (!lead) notFound();

  const options =
    optRes.ok && optRes.data
      ? optRes.data
      : { clients: [], users: [], leads: [] };

  const w = work?.leads.find((l) => l.id === id);

  return (
    <div className="space-y-4">
      {w && work ? (
        <LeadCallBar
          leadId={id}
          name={w.name}
          phone={w.phone}
          today={work.today}
          lastCallAt={w.lastCallAt}
          lastOutcome={w.lastOutcome}
          lastCaller={w.lastCaller}
          attempts={w.attempts}
          noAnswers={w.noAnswers}
          nextAction={w.nextAction}
          nextActionDate={w.nextActionDate}
        />
      ) : null}
    <LeadDetail
      lead={lead}
      activities={activities}
      meetings={meetings}
      tasks={taskRes}
      offers={offers}
      options={options}
    />
    </div>
  );
}
