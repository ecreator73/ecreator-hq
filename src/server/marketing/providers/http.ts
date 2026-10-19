/**
 * Robuster HTTP-Aufruf fuer Marketing-APIs: Zeitlimit, Retry mit
 * exponentiellem Backoff bei 429/5xx und Netzwerkfehlern, Retry-After wird
 * respektiert. Fehlermeldungen enthalten nie Tokens.
 */

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    /** true = Zugang abgelaufen/entzogen -> Integration auf «error» setzen */
    public readonly authError = false,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchJson<T>(
  url: string,
  init: RequestInit & { label: string; retries?: number; timeoutMs?: number },
): Promise<T> {
  const { label, retries = 3, timeoutMs = 25_000, ...rest } = init;
  let attempt = 0;
  for (;;) {
    let res: Response;
    try {
      res = await fetch(url, { ...rest, cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
    } catch (e) {
      if (attempt < retries) {
        await sleep(500 * 2 ** attempt);
        attempt++;
        continue;
      }
      throw new ProviderError(`${label}: Netzwerkfehler (${e instanceof Error ? e.name : "unbekannt"})`);
    }
    const text = await res.text();
    let json: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (res.ok) return json as T;

    if ((res.status === 429 || res.status >= 500) && attempt < retries) {
      const ra = Number(res.headers.get("retry-after"));
      await sleep(Number.isFinite(ra) && ra > 0 ? Math.min(ra, 30) * 1000 : 800 * 2 ** attempt);
      attempt++;
      continue;
    }
    const msg =
      json?.error?.message ||
      json?.[0]?.error?.message ||
      json?.error_description ||
      json?.message ||
      (typeof json?.error === "string" ? json.error : null) ||
      `HTTP ${res.status}`;
    const auth = res.status === 401 || res.status === 403 || json?.error === "invalid_grant";
    throw new ProviderError(`${label}: ${String(msg).slice(0, 300)}`, res.status, auth);
  }
}
