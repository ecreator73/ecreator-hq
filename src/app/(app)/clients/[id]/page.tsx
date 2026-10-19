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
  contactsService,
  invoicesService,
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
  Contact,
  InvoiceWithClient,
} from "@/types/entities";
import { clientLeadsService, clientCrmService, summarize } from "@/server/services/client-leads.service";
import type { TabKey } from "./detail-ui";
import { ClientDetail } from "./client-detail";

export const metadata: Metadata = { title: "Kunde" };

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const { tab } = await searchParams;

  // Unabhaengige Abrufe parallel.
  const [
    client,
    projects,
    tasks,
    reportingCalls,
    interactions,
    checklists,
    files,
    contracts,
    contacts,
    invoices,
    optionsResult,
    clientLeads,
  ] = await Promise.all([
    clientsOpsService.getWithStats(id).catch(() => null),
    projectsService
      .list({ filter: { client_id: id } })
      .catch((): Project[] => []),
    tasksService
      .list(
        { client_id: id },
        { pageSize: 200, sort: { column: "due_date", ascending: true } },
      )
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
    contactsService
      .list({ filter: { client_id: id } })
      .catch((): Contact[] => []),
    invoicesService
      .list({ clientId: id })
      .catch((): InvoiceWithClient[] => []),
    clientFormOptionsAction().catch(() => ({ ok: false as const, error: "" })),
    clientLeadsService.listByClient(id).catch(() => []),
  ]);
  if (!client) notFound();

  const contractItems = await clientCrmService.contractItems(contracts.map((c) => c.id)).catch(() => []);
  const TAB_KEYS: TabKey[] = ["overview", "projects", "tasks", "leads", "reporting", "contracts", "files", "billing", "finance", "activity", "notes"];
  const initialTab = TAB_KEYS.find((k) => k === tab);

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
      contacts={contacts}
      invoices={invoices}
      users={users}
      leadSummary={summarize(clientLeads)}
      contractItems={contractItems}
      initialTab={initialTab}
    />
  );
}
