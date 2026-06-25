import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireRole } from "@/lib/auth";
import { getMetaEnv } from "@/config/meta";
import { metaClient } from "@/server/integrations/meta/client";
import { metaService } from "@/server/integrations/meta/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE = process.env.NEXT_PUBLIC_APP_URL || "https://ecreator-hq.vercel.app";
const back = (q: string) => NextResponse.redirect(new URL(`/settings/integrations/meta?${q}`, BASE));

/** OAuth-Callback: Code -> Token -> Seiten speichern (verschluesselt). */
export async function GET(req: Request) {
  await requireRole(["super_admin", "ceo", "cso"]);
  const env = getMetaEnv();
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const jar = await cookies();
  const expected = jar.get("meta_oauth_state")?.value;
  jar.delete("meta_oauth_state");

  if (!env) return back("error=not_configured");
  if (!code) return back("error=no_code");
  if (!state || !expected || state !== expected) return back("error=state_mismatch");

  try {
    const shortToken = await metaClient.exchangeCode(code);
    await metaService.connectWithToken(shortToken);
    return back("connected=1");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Verbindung fehlgeschlagen";
    return back(`error=${encodeURIComponent(msg)}`);
  }
}
