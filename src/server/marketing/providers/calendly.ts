import { randomBytes } from "node:crypto";
import { fetchJson, ProviderError } from "./http";
import { processCalendlyWebhook } from "../bookings";
import type { Admin } from "../crm";

/**
 * Calendly API v2: Konto pruefen, Webhook registrieren (mit eigenem Signing
 * Key) und Buchungen nachladen (Backfill). Token = Personal Access Token,
 * nur serverseitig, verschluesselt gespeichert. Webhooks brauchen ein
 * bezahltes Calendly-Abo (ab «Standard»).
 */

const API = (process.env.CALENDLY_API_ORIGIN || "https://api.calendly.com").replace(/\/$/, "");
const EVENTS = ["invitee.created", "invitee.canceled"];

/* eslint-disable @typescript-eslint/no-explicit-any */
const auth = (token: string) => ({ authorization: `Bearer ${token}`, "content-type": "application/json" });

export async function calendlyMe(token: string): Promise<{ uri: string; name: string; organization: string }> {
  const json = await fetchJson<{ resource: any }>(`${API}/users/me`, { label: "Calendly", headers: auth(token), retries: 1 });
  const r = json.resource ?? {};
  if (!r.uri || !r.current_organization) throw new ProviderError("Calendly: Konto nicht lesbar.");
  return { uri: r.uri, name: r.name ?? r.email ?? "Calendly", organization: r.current_organization };
}

export function newSigningKey(): string {
  return randomBytes(32).toString("base64url");
}

/** Webhook registrieren; bestehende Abos auf dieselbe URL werden wiederverwendet. */
export async function ensureCalendlyWebhook(
  token: string,
  me: { uri: string; organization: string },
  url: string,
  signingKey: string,
): Promise<{ uri: string; scope: "organization" | "user"; reused: boolean }> {
  for (const scope of ["organization", "user"] as const) {
    const q = new URL(`${API}/webhook_subscriptions`);
    q.searchParams.set("organization", me.organization);
    q.searchParams.set("scope", scope);
    if (scope === "user") q.searchParams.set("user", me.uri);
    try {
      const list = await fetchJson<{ collection?: any[] }>(q.toString(), { label: "Calendly", headers: auth(token), retries: 1 });
      const hit = (list.collection ?? []).find((w) => w.callback_url === url && w.state === "active");
      // Bestehendes Abo kennt unseren Signing Key nicht -> loeschen und neu anlegen.
      if (hit) await fetchJson(hit.uri, { label: "Calendly", method: "DELETE", headers: auth(token), retries: 1 }).catch(() => null);
    } catch {
      /* Scope evtl. nicht erlaubt */
    }
    try {
      const body: Record<string, unknown> = { url, events: EVENTS, organization: me.organization, scope, signing_key: signingKey };
      if (scope === "user") body.user = me.uri;
      const res = await fetchJson<{ resource: { uri: string } }>(`${API}/webhook_subscriptions`, {
        label: "Calendly",
        method: "POST",
        headers: auth(token),
        body: JSON.stringify(body),
        retries: 1,
      });
      return { uri: res.resource.uri, scope, reused: false };
    } catch (e) {
      if (scope === "user") throw e;
      // Organisations-Scope braucht Admin-Rechte -> mit Benutzer-Scope weiter.
    }
  }
  throw new ProviderError("Calendly: Webhook konnte nicht registriert werden.");
}

/** Buchungen der letzten `days` Tage nachladen (idempotent, gleiche Logik wie der Webhook). */
export async function backfillCalendly(db: Admin, token: string, me: { uri: string; organization: string }, days = 90): Promise<number> {
  const min = new Date(Date.now() - days * 86_400_000).toISOString();
  let next: string | null = (() => {
    const u = new URL(`${API}/scheduled_events`);
    u.searchParams.set("organization", me.organization);
    u.searchParams.set("min_start_time", min);
    u.searchParams.set("count", "100");
    return u.toString();
  })();
  let n = 0;
  let guard = 0;
  while (next && guard++ < 50) {
    const page: { collection?: any[]; pagination?: { next_page?: string | null } } = await fetchJson(next, { label: "Calendly", headers: auth(token) });
    for (const ev of page.collection ?? []) {
      let inv: string | null = `${ev.uri}/invitees?count=100`;
      let g2 = 0;
      while (inv && g2++ < 20) {
        const ip: { collection?: any[]; pagination?: { next_page?: string | null } } = await fetchJson(inv, { label: "Calendly", headers: auth(token) });
        for (const i of ip.collection ?? []) {
          const payload = { ...i, scheduled_event: ev };
          await processCalendlyWebhook(db, { event: "invitee.created", payload }, { backfill: true });
          if (i.status === "canceled") await processCalendlyWebhook(db, { event: "invitee.canceled", payload }, { backfill: true });
          n++;
        }
        inv = ip.pagination?.next_page ?? null;
      }
    }
    next = page.pagination?.next_page ?? null;
  }
  return n;
}
