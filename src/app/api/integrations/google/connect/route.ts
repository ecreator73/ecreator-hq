import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { LEADERSHIP_ROLES } from "@/config/navigation";
import { googleAuthUrl } from "@/server/marketing/providers/google";
import { appBaseUrl, googleEnv } from "@/server/marketing/integrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Startet Google-OAuth (GA4, Google Ads, Search Console - nur Lesen). Nur Leitung. */
export async function GET() {
  await requireRole(LEADERSHIP_ROLES);
  if (!googleEnv()) return NextResponse.redirect(new URL("/marketing/integrations?error=google_not_configured", appBaseUrl()));
  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(googleAuthUrl(state));
  res.cookies.set("google_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  return res;
}
