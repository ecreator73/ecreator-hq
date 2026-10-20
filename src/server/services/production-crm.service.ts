import { getContext } from "./_helpers";
import type { ContentProject, Shoot } from "@/types/entities";

/**
 * Production aus dem Kunden-CRM: Shooting-Uebersicht und -Detail (Model,
 * Terminvorschlaege, Skripte), Bewerbungen, Redaktionsplan.
 * Liest mit der Session (RLS).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Person {
  id: string;
  full_name: string | null;
}

export interface ShootAssignmentRow {
  id: string;
  status: string;
  agreed_rate: number | null;
  creator: { id: string; first_name: string; last_name: string | null; city: string | null; instagram_handle: string | null } | null;
}

export interface ShootScript {
  id: string;
  video_number: number | null;
  title: string | null;
  hook: string | null;
  script: string | null;
  cta: string | null;
  notes: string | null;
  status: "draft" | "review" | "approved";
}

export interface ShootDateOption {
  id: string;
  starts_at: string;
  customer_available: boolean | null;
  model_available: boolean | null;
  notes: string | null;
}

export interface ShootOverview extends Shoot {
  client: { id: string; name: string } | null;
  responsible: Person | null;
  editor: Person | null;
  assignments: ShootAssignmentRow[];
  options_count: number;
  scripts_count: number;
}

export interface ShootDetail extends ShootOverview {
  scripts: ShootScript[];
  options: ShootDateOption[];
}

export interface CreatorApplication {
  id: string;
  creator_id: string | null;
  status: "new" | "reviewing" | "on_hold" | "accepted" | "rejected";
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  birth_year: number | null;
  city: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  languages: string[];
  experience: string | null;
  about: string | null;
  photo_path: string | null;
  video_path: string | null;
  photo_file: string | null;
  video_file: string | null;
  portfolio_url: string | null;
  rate_expectation: string | null;
  source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  privacy_consent: boolean;
  privacy_consent_at: string | null;
  decided_at: string | null;
  rejection_email_sent_at: string | null;
  on_hold_email_sent_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface ContentPlan {
  id: string;
  client_id: string | null;
  year: number;
  month: number;
  status: "planning" | "in_review" | "approved" | "done";
  notes: string | null;
  responsible: Person | null;
  client: { id: string; name: string } | null;
}

export interface ContentItem extends ContentProject {
  client: { id: string; name: string } | null;
  owner: Person | null;
}

const SHOOT_SELECT = `*,
  client:clients!shoots_client_id_fkey(id,name),
  responsible:profiles!shoots_responsible_id_fkey(id,full_name),
  editor:profiles!shoots_editor_id_fkey(id,full_name),
  assignments:shoot_assignments(id,status,agreed_rate,deleted_at,creator:creators(id,first_name,last_name,city,instagram_handle)),
  options:shoot_date_options(count),
  scripts:shoot_scripts(count)`;

function mapShoot(r: any): ShootOverview {
  return {
    ...r,
    assignments: ((r.assignments ?? []) as any[]).filter((a) => !a.deleted_at),
    options_count: r.options?.[0]?.count ?? 0,
    scripts_count: r.scripts?.[0]?.count ?? 0,
  };
}

export const productionCrmService = {
  async shoots(): Promise<ShootOverview[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("shoots").select(SHOOT_SELECT).is("deleted_at", null).order("shooting_date", { ascending: true, nullsFirst: true }).limit(500);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapShoot);
  },

  async shoot(id: string): Promise<ShootDetail | null> {
    const { supabase } = await getContext();
    const [s, scripts, options] = await Promise.all([
      supabase.from("shoots").select(SHOOT_SELECT).eq("id", id).is("deleted_at", null).maybeSingle(),
      supabase.from("shoot_scripts").select("id, video_number, title, hook, script, cta, notes, status").eq("shoot_id", id).order("video_number", { ascending: true, nullsFirst: false }).order("created_at"),
      supabase.from("shoot_date_options").select("id, starts_at, customer_available, model_available, notes").eq("shoot_id", id).order("starts_at"),
    ]);
    if (s.error) throw new Error(s.error.message);
    if (!s.data) return null;
    return { ...mapShoot(s.data), scripts: (scripts.data ?? []) as ShootScript[], options: (options.data ?? []) as ShootDateOption[] };
  },

  async applications(): Promise<CreatorApplication[]> {
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("creator_applications").select("*").order("created_at", { ascending: false }).limit(1000);
    if (error) throw new Error(error.message);
    return (data ?? []) as CreatorApplication[];
  },

  async contentMonth(from: string, to: string, year: number, month: number): Promise<{ items: ContentItem[]; backlog: ContentItem[]; plans: ContentPlan[] }> {
    const { supabase } = await getContext();
    const sel = "*, client:clients!content_projects_client_id_fkey(id,name), owner:profiles!content_projects_owner_id_fkey(id,full_name)";
    const [items, backlog, plans] = await Promise.all([
      supabase.from("content_projects").select(sel).is("deleted_at", null).gte("scheduled_for", from).lt("scheduled_for", to).order("scheduled_for"),
      supabase.from("content_projects").select(sel).is("deleted_at", null).is("scheduled_for", null).order("created_at", { ascending: false }).limit(200),
      supabase
        .from("content_plans")
        .select("id, client_id, year, month, status, notes, responsible:profiles!content_plans_responsible_id_fkey(id,full_name), client:clients!content_plans_client_id_fkey(id,name)")
        .eq("year", year)
        .eq("month", month),
    ]);
    if (items.error) throw new Error(items.error.message);
    return {
      items: (items.data ?? []) as ContentItem[],
      backlog: (backlog.data ?? []) as ContentItem[],
      plans: (plans.data ?? []) as unknown as ContentPlan[],
    };
  },
};
