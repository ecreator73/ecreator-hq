import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireRole } from "@/lib/auth";
import { LEADERSHIP_ROLES } from "@/config/navigation";
import { exchangeGoogleCode } from "@/server/marketing/providers/google";
import { appBaseUrl, getCredentials, saveIntegration, type GoogleCredentials } from "@/server/marketing/integrations";
import { logMarketingActivity } from "@/server/marketing/crm";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const back = (q: string) => NextResponse.redirect(new URL(`/marketing/integrations?${q}`, appBaseUrl()));

/** OAuth-Callback: Code -> Tokens (verschluesselt). Danach Property/Konto/Site waehlen. */
export async function GET(req: Request) {
  await requireRole(LEADERSHIP_ROLES);
  const url = new URL(req.url);
  const jar = await cookies();
  const expected = jar.get("google_oauth_state")?.value;
  jar.delete("google_oauth_state");
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  if (url.searchParams.get("error")) return back(`error=${encodeURIComponent(url.searchParams.get("error")!)}`);
  if (!code) return back("error=no_code");
  if (!state || !expected || state !== expected) return back("error=state_mismatch");

  try {
    const { creds, email } = await exchangeGoogleCode(code);
    // Google liefert das Refresh-Token nur bei erster Zustimmung - vorhandenes behalten.
    const old = await getCredentials<GoogleCredentials>("google");
    const merged: GoogleCredentials = { ...creds, refresh_token: creds.refresh_token ?? old?.refresh_token };
    await saveIntegration("google", {
      status: "connected",
      account_name: email,
      credentials: merged as Record<string, unknown>,
      config: { email, scopes: (creds.scope ?? "").split(/\s+/).filter(Boolean) },
      last_error: merged.refresh_token ? null : "Kein Refresh-Token erhalten - Zugriff in Google entfernen und neu verbinden.",
    });
    await logMarketingActivity(createAdminClient(), { type: "integration_connected", source: "ga4", title: "Google verbunden", detail: email ?? undefined });
    return back("connected=google");
  } catch (e) {
    return back(`error=${encodeURIComponent(e instanceof Error ? e.message.slice(0, 200) : "Verbindung fehlgeschlagen")}`);
  }
}
