import { fetchJson, ProviderError } from "./http";
import {
  appBaseUrl,
  getCredentials,
  googleEnv,
  saveIntegration,
  type GoogleCredentials,
} from "../integrations";

/**
 * Google-OAuth (ein Client fuer GA4, Google Ads und Search Console).
 * Nur Lesezugriffe. Refresh-Token wird verschluesselt gespeichert, das
 * Access-Token bei Bedarf erneuert.
 */

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export const GOOGLE_SCOPES = {
  ga4: "https://www.googleapis.com/auth/analytics.readonly",
  gsc: "https://www.googleapis.com/auth/webmasters.readonly",
  ads: "https://www.googleapis.com/auth/adwords",
} as const;

export function googleRedirectUri(): string {
  return `${appBaseUrl()}/api/integrations/google/callback`;
}

export function googleAuthUrl(state: string): string {
  const env = googleEnv();
  if (!env) throw new ProviderError("Google-OAuth ist nicht konfiguriert (GOOGLE_OAUTH_CLIENT_ID/SECRET fehlen).");
  const u = new URL(AUTH_URL);
  u.searchParams.set("client_id", env.clientId);
  u.searchParams.set("redirect_uri", googleRedirectUri());
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", ["openid", "email", GOOGLE_SCOPES.ga4, GOOGLE_SCOPES.gsc, GOOGLE_SCOPES.ads].join(" "));
  u.searchParams.set("access_type", "offline");
  u.searchParams.set("prompt", "consent");
  u.searchParams.set("include_granted_scopes", "true");
  u.searchParams.set("state", state);
  return u.toString();
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  id_token?: string;
}

export async function exchangeGoogleCode(code: string): Promise<{ creds: GoogleCredentials; email: string | null }> {
  const env = googleEnv();
  if (!env) throw new ProviderError("Google-OAuth ist nicht konfiguriert.");
  const json = await fetchJson<TokenResponse>(TOKEN_URL, {
    label: "Google-OAuth",
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.clientId,
      client_secret: env.clientSecret,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
    retries: 1,
  });
  let email: string | null = null;
  if (json.id_token) {
    try {
      const payload = JSON.parse(Buffer.from(json.id_token.split(".")[1] ?? "", "base64url").toString("utf8")) as { email?: string };
      email = payload.email ?? null;
    } catch {
      email = null;
    }
  }
  return {
    email,
    creds: {
      refresh_token: json.refresh_token,
      access_token: json.access_token,
      expires_at: Date.now() + (json.expires_in ?? 3600) * 1000,
      scope: json.scope,
    },
  };
}

/** Gueltiges Access-Token (erneuert und speichert bei Bedarf). */
export async function googleAccessToken(): Promise<string> {
  const creds = await getCredentials<GoogleCredentials>("google");
  if (!creds?.refresh_token && !creds?.access_token) throw new ProviderError("Google ist nicht verbunden.", 401, true);
  if (creds.access_token && creds.expires_at && creds.expires_at > Date.now() + 60_000) return creds.access_token;
  const env = googleEnv();
  if (!env || !creds.refresh_token) throw new ProviderError("Google-Zugang abgelaufen - bitte neu verbinden.", 401, true);
  try {
    const json = await fetchJson<TokenResponse>(TOKEN_URL, {
      label: "Google-Token",
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.clientId,
        client_secret: env.clientSecret,
        refresh_token: creds.refresh_token,
        grant_type: "refresh_token",
      }),
      retries: 2,
    });
    const next: GoogleCredentials = {
      ...creds,
      access_token: json.access_token,
      expires_at: Date.now() + (json.expires_in ?? 3600) * 1000,
    };
    await saveIntegration("google", { credentials: next as Record<string, unknown> });
    return json.access_token;
  } catch (e) {
    if (e instanceof ProviderError && e.authError) {
      await saveIntegration("google", { status: "error", last_error: "Google-Zugang abgelaufen oder entzogen - bitte neu verbinden." });
    }
    throw e;
  }
}

export function hasScope(scope: string | undefined, needed: string): boolean {
  return (scope ?? "").split(/\s+/).includes(needed);
}
