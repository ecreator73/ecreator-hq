import { resolveRange, type ResolvedRange } from "@/lib/marketing/range";

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export async function rangeFrom(searchParams: SearchParams): Promise<{ range: ResolvedRange; sp: Record<string, string | undefined> }> {
  const raw = await searchParams;
  const sp: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(raw)) sp[k] = one(v);
  return { range: resolveRange({ range: sp.range, from: sp.from, to: sp.to, compare: sp.compare }), sp };
}
