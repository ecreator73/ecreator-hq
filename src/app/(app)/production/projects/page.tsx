import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ProjectsTable } from "@/components/production/projects-table";
import { projectListService } from "@/server/services";
import type { ProjectListItem } from "@/server/services";

export const metadata: Metadata = { title: "Production - Projekte" };

export default async function ProductionProjectsPage() {
  let items: ProjectListItem[] = [];
  try {
    items = await projectListService.all();
  } catch {
    items = [];
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Production"
        title="Alle Projekte"
        description="Saemtliche Produktionsprojekte aller Typen (Websites, Ads, CRM-Builds, Content) an einem Ort."
      />
      <ProjectsTable items={items} />
    </div>
  );
}
