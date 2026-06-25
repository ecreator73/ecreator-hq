/**
 * Konfiguration der Meta-(Facebook-)Integration. NUR serverseitig nutzen
 * (liest Secrets aus der Server-Umgebung). Keine Secrets im Frontend.
 */
export const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v21.0";
export const META_GRAPH = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

/** OAuth-Scopes fuer Lead-Ads (App-Review erforderlich fuer Produktivbetrieb). */
export const META_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_metadata",
  "leads_retrieval",
  "ads_read",
  "business_management",
].join(",");

export interface MetaEnv {
  appId: string;
  appSecret: string;
  verifyToken: string;
  redirectUri: string;
}

/** Liefert die Meta-Env oder null (UI kann so "noch nicht konfiguriert" zeigen). */
export function getMetaEnv(): MetaEnv | null {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const verifyToken = process.env.META_VERIFY_TOKEN;
  if (!appId || !appSecret || !verifyToken) return null;
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://ecreator-hq.vercel.app";
  return {
    appId,
    appSecret,
    verifyToken,
    redirectUri: `${base}/api/integrations/meta/callback`,
  };
}

export function isMetaConfigured(): boolean {
  return getMetaEnv() !== null;
}
