import { websiteProjectsService } from "./website-projects.service";
import { adProjectsService } from "./ad-projects.service";
import { crmProjectsService } from "./crm-projects.service";
import { contentProjectsService } from "./content-projects.service";
import { statusLabel } from "@/config/catalog";

export type ProjectType = "website" | "ad" | "crm" | "content";

export interface ProjectListItem {
  id: string;
  title: string;
  type: ProjectType;
  typeLabel: string;
  clientId: string | null;
  clientName: string | null;
  status: string;
  statusLabel: string;
  href: string;
}

interface RawProject {
  id: string;
  title: string | null;
  status: string | null;
  client: { id: string; name: string } | null;
}

const META: Record<
  ProjectType,
  { label: string; seg: string; entity: "website_project" | "ad_project" | "crm_project" | "content_project" }
> = {
  website: { label: "Website", seg: "websites", entity: "website_project" },
  ad: { label: "Ad-Kampagne", seg: "ads", entity: "ad_project" },
  crm: { label: "CRM-Build", seg: "crm", entity: "crm_project" },
  content: { label: "Content", seg: "content", entity: "content_project" },
};

/** Alle Produktionsprojekte aller vier Typen als einheitliche Liste. */
export const projectListService = {
  async all(): Promise<ProjectListItem[]> {
    const [w, a, c, co] = await Promise.all([
      websiteProjectsService.list().catch(() => []),
      adProjectsService.list().catch(() => []),
      crmProjectsService.list().catch(() => []),
      contentProjectsService.list().catch(() => []),
    ]);

    const items: ProjectListItem[] = [];
    const add = (rows: unknown[], type: ProjectType) => {
      const meta = META[type];
      for (const raw of rows as RawProject[]) {
        items.push({
          id: raw.id,
          title: raw.title ?? "Unbenanntes Projekt",
          type,
          typeLabel: meta.label,
          clientId: raw.client?.id ?? null,
          clientName: raw.client?.name ?? null,
          status: raw.status ?? "",
          statusLabel: statusLabel(meta.entity, raw.status),
          href: `/production/${meta.seg}/${raw.id}`,
        });
      }
    };
    add(w, "website");
    add(a, "ad");
    add(c, "crm");
    add(co, "content");

    return items.sort((x, y) =>
      (x.clientName ?? "").localeCompare(y.clientName ?? "") ||
      x.title.localeCompare(y.title),
    );
  },
};
