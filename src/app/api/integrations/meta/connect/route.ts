import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getMetaEnv, META_SCOPES, META_GRAPH_VERSION } from "@/config/meta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE = process.env.NEXT_PUBLIC_APP_URL || "https://ecreator-hq.vercel.app";

/** Startet den Facebook-Login (OAuth-Dialog). Nur Leitung. */
export async function GET() {
  await requireRole(["super_admin", "ceo", "cso"]);
  const env = getMetaEnv();
  if (!env) {
    return NextResponse.redirect(new URL("/settings/integrations/meta?error=not_configured", BASE));
  }
  const state = randomBytes(16).toString("hex");
  const dialog = new URL(`https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth`);
  dialog.searchParams.set("client_id", env.appId);
  dialog.searchParams.set("redirect_uri", env.redirectUri);
  dialog.searchParams.set("scope", META_SCOPES);
  dialog.searchParams.set("state", state);
  dialog.searchParams.set("response_type", "code");

  const res = NextResponse.redirect(dialog.toString());
  res.cookies.set("meta_oauth_state", state, {
    httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/",
  });
  return res;
}
