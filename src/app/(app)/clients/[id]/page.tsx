import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  clientsOpsService,
  projectsService,
  tasksService,
  reportingCallsService,
  clientInteractionsService,
  clientChecklistsService,
  filesService,
  contractsService,
} from "@/server/services";
import { clientFormOptionsAction } from "@/app/(app)/clients/actions";
import type {
  Project,
  TaskWithRelations,
  ReportingCallWithRelations,
  ClientInteraction,
  ClientChecklist,
  FileRecord,
  Contract,
} from "@/types/entities";
import { ClientDetail } from "./client-detail";

export const metadata: Metadata = { title: "Kunde" };

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const client = await clientsOpsService.getWithStats(id).catch(() => null);
  if (!client) notFound();

  const [
    projects,
    tasks,
    reportingCalls,
    interactions,
    checklists,
    files,
    contracts,
    optionsResult,
  ] = await Promise.all([
    projectsService
      .list({ filter: { client_id: id } })
      .catch((): Project[] => []),
    tasksService
      .list({ client_id: id })
      .then((r) => r.rows)
      .catch((): TaskWithRelations[] => []),
    reportingCallsService
      .listByClient(id)
      .catch((): ReportingCallWithRelations[] => []),
    clientInteractionsService
      .listByClient(id)
      .catch((): ClientInteraction[] => []),
    clientChecklistsService
      .listByClient(id)
      .catch((): ClientChecklist[] => []),
    filesService
      .list({ filter: { client_id: id } })
      .catch((): FileRecord[] => []),
    contractsService
      .list({ filter: { client_id: id } })
      .catch((): Contract[] => []),
    clientFormOptionsAction().catch(() => ({ ok: false as const, error: "" })),
  ]);

  const users =
    optionsResult.ok && optionsResult.data ? optionsResult.data.users : [];

  return (
    <ClientDetail
      client={client}
      projects={projects}
      tasks={tasks}
      reportingCalls={reportingCalls}
      interactions={interactions}
      checklists={checklists}
      files={files}
      contracts={contracts}
      users={users}
    />
  );
}
