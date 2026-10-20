import { getViewer } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RoleKey } from "@/config/roles";

/**
 * Creator-Medien (Fotos, Videos, Sedcards) im privaten Speicher «creator-media».
 * Browser-Clients haben keinen direkten Zugriff; die App gibt zeitlich begrenzte
 * Links aus, nur an Leitung, Projektleitung und Creative.
 */

const BUCKET = "creator-media";
const ROLES: RoleKey[] = ["super_admin", "ceo", "cso", "project_manager", "creative"];

export type MediaKind = "image" | "video" | "pdf";

export function mediaKind(path: string | null | undefined): MediaKind | null {
  if (!path) return null;
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "webp", "heic"].includes(ext)) return "image";
  if (["mp4", "mov", "m4v", "webm"].includes(ext)) return "video";
  if (ext === "pdf") return "pdf";
  return null;
}

/** Pfad -> signierter Link (1 Std.). Leer, wenn die Rolle nicht berechtigt ist. */
export async function signCreatorMedia(paths: Array<string | null | undefined>, seconds = 3600): Promise<Record<string, string>> {
  const list = [...new Set(paths.filter((p): p is string => !!p))];
  if (!list.length) return {};
  const viewer = await getViewer();
  if (!viewer || !canAccess(viewer.roles, ROLES)) return {};
  const { data, error } = await createAdminClient().storage.from(BUCKET).createSignedUrls(list, seconds);
  if (error || !data) return {};
  const out: Record<string, string> = {};
  for (const d of data) if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  return out;
}
