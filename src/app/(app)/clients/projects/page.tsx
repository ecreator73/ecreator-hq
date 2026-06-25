import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ProjectsTable } from "@/components/production/projects-table";
import { projectListService } from "@/server/services";
import type { ProjectListItem } from "@/server/services";

export const metadata: Metadata = { title: "Clients - Projekte" };

export default async function ClientsProjectsPage() {
  let items: ProjectListItem[] = [];
  try {
    items = await projectListService.all();
  } catch {
    items = [];
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Clients"
        title="Kundenprojekte"
        description="Alle laufenden Projekte je Kunde - direkt verknuepft mit Produktion. Nach Kunde sortiert."
      />
      <ProjectsTable items={items} />
    </div>
  );
}
