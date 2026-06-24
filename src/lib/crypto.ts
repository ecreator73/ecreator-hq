import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";

/**
 * Symmetrische Verschluesselung fuer Integrations-Credentials (AES-256-GCM).
 * NUR serverseitig nutzen. Der Schluessel kommt aus `process.env.CREDENTIALS_SECRET`
 * - ohne diese Variable koennen keine Credentials gespeichert werden (bewusst:
 * keine hardcoded Secrets, kein unverschluesseltes Ablegen).
 */

const SALT = "ecreator-os.integration.v1";

function getKey(): Buffer {
  const secret = process.env.CREDENTIALS_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "CREDENTIALS_SECRET fehlt oder ist zu kurz - Credentials koennen nicht verschluesselt werden.",
    );
  }
  return scryptSync(secret, SALT, 32);
}

/** Liegt ein Schluessel vor? (UI kann so Hinweise zeigen, ohne zu werfen.) */
export function hasCredentialsKey(): boolean {
  const secret = process.env.CREDENTIALS_SECRET;
  return Boolean(secret && secret.length >= 16);
}

/** Klartext -> base64(iv | authTag | ciphertext). */
export function encryptSecret(plain: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

/** Umkehrung von encryptSecret; wirft bei ungueltigen Daten. */
export function decryptSecret(payload: string): string {
  const key = getKey();
  const raw = Buffer.from(payload, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const data = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

/** Maskierte Darstellung eines Secrets fuer die UI (nie das Klartext-Secret). */
export function maskSecret(value: string | null | undefined): string {
  if (!value) return "-";
  if (value.length <= 4) return "••••";
  return `••••${value.slice(-4)}`;
}
