import { getContext } from "./_helpers";

export interface SearchItem {
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
}
export interface SearchGroup {
  key: string;
  label: string;
  items: SearchItem[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function rows(res: any): any[] {
  return (res?.data ?? []) as any[];
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Globale Suche ueber die wichtigsten Entitaeten (RLS-sicher via Session-Client).
 * Pro Typ ilike auf das Hauptfeld, begrenzt - schnell genug fuer Tipp-Suche.
 */
export const searchService = {
  async global(query: string): Promise<SearchGroup[]> {
    const q = query.trim();
    if (q.length < 2) return [];
    const like = `%${q}%`;
    const { supabase } = await getContext();
    const L = 6;

    const [
      clients,
      leads,
      tasks,
      offers,
      contracts,
      creators,
      files,
      web,
      ads,
      crm,
      content,
    ] = await Promise.all([
      supabase.from("clients").select("id, name").is("deleted_at", null).ilike("name", like).limit(L),
      supabase.from("leads").select("id, company_name").is("deleted_at", null).ilike("company_name", like).limit(L),
      supabase.from("tasks").select("id, title").is("deleted_at", null).ilike("title", like).limit(L),
      supabase.from("offers").select("id, title").is("deleted_at", null).ilike("title", like).limit(L),
      supabase.from("contracts").select("id, title, client:clients!contracts_client_id_fkey(name)").is("deleted_at", null).ilike("title", like).limit(L),
      supabase.from("creators").select("id, first_name, last_name").is("deleted_at", null).or(`first_name.ilike.${like},last_name.ilike.${like}`).limit(L),
      supabase.from("files").select("id, filename, client_id").is("deleted_at", null).ilike("filename", like).limit(L),
      supabase.from("website_projects").select("id, title, client:clients!website_projects_client_id_fkey(name)").is("deleted_at", null).ilike("title", like).limit(L),
      supabase.from("ad_projects").select("id, title, client:clients!ad_projects_client_id_fkey(name)").is("deleted_at", null).ilike("title", like).limit(L),
      supabase.from("crm_projects").select("id, title, client:clients!crm_projects_client_id_fkey(name)").is("deleted_at", null).ilike("title", like).limit(L),
      supabase.from("content_projects").select("id, title, client:clients!content_projects_client_id_fkey(name)").is("deleted_at", null).ilike("title", like).limit(L),
    ]).catch(() => []);

    const cname = (r: { client?: { name?: string } | null }) => r.client?.name ?? null;
    const projects: SearchItem[] = [];
    const pushProjects = (res: unknown, seg: string) => {
      for (const r of rows(res) as Array<{ id: string; title: string | null; client?: { name?: string } | null }>) {
        projects.push({
          id: r.id,
          title: r.title || "Projekt",
          subtitle: cname(r),
          href: `/production/${seg}/${r.id}`,
        });
      }
    };
    pushProjects(web, "websites");
    pushProjects(ads, "ads");
    pushProjects(crm, "crm");
    pushProjects(content, "content");

    const groups: SearchGroup[] = [
      {
        key: "clients",
        label: "Kunden",
        items: rows(clients).map((r) => ({ id: r.id, title: r.name, subtitle: null, href: `/clients/${r.id}` })),
      },
      {
        key: "leads",
        label: "Leads",
        items: rows(leads).map((r) => ({ id: r.id, title: r.company_name, subtitle: null, href: `/sales/leads/${r.id}` })),
      },
      {
        key: "tasks",
        label: "Aufgaben",
        items: rows(tasks).map((r) => ({ id: r.id, title: r.title, subtitle: null, href: `/tasks/${r.id}` })),
      },
      { key: "projects", label: "Projekte", items: projects.slice(0, L) },
      {
        key: "offers",
        label: "Angebote",
        items: rows(offers).map((r) => ({ id: r.id, title: r.title, subtitle: null, href: `/sales/offers` })),
      },
      {
        key: "contracts",
        label: "Verträge",
        items: rows(contracts).map((r) => ({ id: r.id, title: cname(r) ?? r.title, subtitle: r.title, href: `/sales/contracts` })),
      },
      {
        key: "creators",
        label: "Creator",
        items: rows(creators).map((r) => ({ id: r.id, title: [r.first_name, r.last_name].filter(Boolean).join(" "), subtitle: null, href: `/production/creators/${r.id}` })),
      },
      {
        key: "files",
        label: "Dateien",
        items: rows(files).map((r) => ({ id: r.id, title: r.filename, subtitle: null, href: r.client_id ? `/clients/${r.client_id}` : `/production/assets` })),
      },
    ];

    return groups.filter((g) => g.items.length > 0);
  },
};
