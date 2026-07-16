import { notFound } from "next/navigation";
import {
  linkedinProspectsService,
  linkedinActivitiesService,
  linkedinMessagesService,
  linkedinTemplatesService,
} from "@/server/services";
import { linkedinFormOptionsAction } from "@/app/(app)/sales/linkedin/actions";
import { buildProspectInsights } from "@/lib/linkedin";
import { ProspectDetail } from "@/components/linkedin/prospect-detail";

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Unabhaengige Abrufe parallel - jeder Fehler faellt weich zurueck.
  const [prospect, activities, messages, tasks, templates, optRes] =
    await Promise.all([
      linkedinProspectsService.getById(id).catch(() => null),
      linkedinActivitiesService.listByProspect(id).catch(() => []),
      linkedinMessagesService.listByProspect(id).catch(() => []),
      linkedinProspectsService.tasks(id).catch(() => []),
      linkedinTemplatesService.list().catch(() => []),
      linkedinFormOptionsAction(),
    ]);
  if (!prospect) notFound();

  const options =
    optRes.ok && optRes.data ? optRes.data : { users: [], campaigns: [] };

  // Insights serverseitig, rein regelbasiert aus den vorhandenen Daten.
  const openTasks = tasks.filter(
    (t) => !["done", "archived"].includes(t.status?.key ?? ""),
  ).length;
  const daysSinceActivity = prospect.last_activity_at
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(prospect.last_activity_at).getTime()) /
            86_400_000,
        ),
      )
    : null;
  const insights = buildProspectInsights(prospect, {
    openTasks,
    daysSinceActivity,
  });

  return (
    <ProspectDetail
      prospect={prospect}
      activities={activities}
      messages={messages}
      tasks={tasks}
      templates={templates}
      options={options}
      insights={insights}
    />
  );
}
