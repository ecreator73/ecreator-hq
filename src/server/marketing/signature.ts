import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * HMAC-SHA256-Signaturen im Format «t=<unix-sekunden>,v1=<hex>» ueber
 * `${t}.${rawBody}`. Gleiches Schema wie Calendly-Webhooks
 * (Header «Calendly-Webhook-Signature») und der Website-Lead-Eingang
 * (Header «X-Ecreator-Signature»).
 *
 * Toleranz gegen Replays: Zeitstempel hoechstens 5 Minuten alt.
 */
const TOLERANCE_SEC = 5 * 60;

export type SignatureCheck =
  | { ok: true }
  | { ok: false; reason: "missing" | "malformed" | "expired" | "mismatch" | "not_configured" };

export function sign(secret: string, rawBody: string, t = Math.floor(Date.now() / 1000)): string {
  const v1 = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  return `t=${t},v1=${v1}`;
}

export function verifySignature(
  header: string | null,
  rawBody: string,
  secret: string | undefined,
  now = Math.floor(Date.now() / 1000),
): SignatureCheck {
  if (!secret) return { ok: false, reason: "not_configured" };
  if (!header) return { ok: false, reason: "missing" };

  let t: number | null = null;
  const sigs: string[] = [];
  for (const part of header.split(",")) {
    const [k, v] = part.trim().split("=", 2);
    if (k === "t" && v) t = Number(v);
    if (k === "v1" && v) sigs.push(v);
  }
  if (!t || !Number.isFinite(t) || sigs.length === 0) return { ok: false, reason: "malformed" };
  if (Math.abs(now - t) > TOLERANCE_SEC) return { ok: false, reason: "expired" };

  const expected = Buffer.from(createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex"), "utf8");
  const match = sigs.some((s) => {
    const given = Buffer.from(s, "utf8");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
  return match ? { ok: true } : { ok: false, reason: "mismatch" };
}
