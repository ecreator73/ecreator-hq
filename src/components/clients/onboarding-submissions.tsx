"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import type { OnboardingSubmission } from "@/server/services/client-leads.service";
import { assignOnboardingAction, setOnboardingStatusAction } from "@/app/(app)/clients/crm-actions";
import { cn } from "@/lib/utils";

const df = new Intl.DateTimeFormat("de-CH", { timeZone: "Europe/Zurich", day: "2-digit", month: "2-digit", year: "numeric" });

function valueText(v: unknown): string {
  if (v == null || v === "") return "–";
  if (Array.isArray(v)) return v.map(valueText).join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  if (typeof v === "boolean") return v ? "Ja" : "Nein";
  return String(v);
}
const keyLabel = (k: string) => k.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export function OnboardingSubmissions({ submissions, clients }: { submissions: OnboardingSubmission[]; clients: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState<string | null>(null);
  const [show, setShow] = useState<"open" | "closed" | "all">("open");
  const [msg, setMsg] = useState<string | null>(null);
  const name = new Map(clients.map((c) => [c.id, c.name]));
  const list = submissions.filter((s) => show === "all" || s.status === show);
  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? r.message ?? "Gespeichert" : r.error ?? "Fehler");
      if (r.ok) router.refresh();
    });

  return (
    <section className="rounded-xl border border-neutral-200 bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-5 py-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">Onboarding-Formulare</h2>
          <p className="text-xs text-neutral-500">Einsendungen der Kunden mit Angaben zu Firma, Region, Budget und Leistungen.</p>
        </div>
        <div className="flex rounded-lg border border-neutral-200 p-0.5 text-xs" role="group" aria-label="Filter">
          {(["open", "closed", "all"] as const).map((k) => (
            <button key={k} type="button" onClick={() => setShow(k)} aria-pressed={show === k} className={cn("rounded-md px-2.5 py-1", show === k ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-50")}>
              {k === "open" ? `Offen (${submissions.filter((s) => s.status === "open").length})` : k === "closed" ? "Erledigt" : "Alle"}
            </button>
          ))}
        </div>
      </header>
      {msg ? <p className="px-5 pt-3 text-xs text-neutral-600" role="status">{msg}</p> : null}
      {list.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-neutral-500">Keine Einsendungen in dieser Ansicht.</p>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {list.map((s) => {
            const expanded = open === s.id;
            const answers = Object.entries(s.answers ?? {}).filter(([, v]) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0));
            return (
              <li key={s.id} className="px-5 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" onClick={() => setOpen(expanded ? null : s.id)} aria-expanded={expanded} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    <ChevronDown className={cn("h-4 w-4 shrink-0 text-neutral-400 transition-transform", expanded && "rotate-180")} aria-hidden />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-neutral-900">{s.company || s.name || "Ohne Firmennamen"}</span>
                      <span className="block truncate text-xs text-neutral-500">
                        {[s.name, s.city, s.monthly_ad_budget ? `Budget ${s.monthly_ad_budget}` : null, df.format(new Date(s.created_at))].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </button>
                  <select
                    aria-label="Kunde zuweisen"
                    value={s.client_id ?? ""}
                    disabled={pending}
                    onChange={(e) => run(() => assignOnboardingAction(s.id, e.target.value || null))}
                    className="h-8 max-w-[220px] rounded-md border border-neutral-200 bg-white px-2 text-xs"
                  >
                    <option value="">Kunde zuweisen…</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {s.client_id ? (
                    <Link href={`/clients/${s.client_id}`} className="text-xs text-brand-700 hover:underline">
                      {name.get(s.client_id) ?? "Kunde"} öffnen
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => setOnboardingStatusAction(s.id, s.status === "open" ? "closed" : "open"))}
                    className={cn("h-8 rounded-md px-2.5 text-xs font-medium", s.status === "open" ? "bg-emerald-600 text-white hover:bg-emerald-700" : "border border-neutral-200 text-neutral-600 hover:bg-neutral-50")}
                  >
                    {s.status === "open" ? "Als erledigt markieren" : "Wieder öffnen"}
                  </button>
                </div>
                {expanded ? (
                  <dl className="mt-3 grid gap-x-6 gap-y-2 rounded-lg bg-neutral-50 p-4 text-sm sm:grid-cols-2">
                    {[
                      ["E-Mail", s.email],
                      ["Telefon", s.phone],
                      ["Adresse", [s.address, [s.zip_code, s.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")],
                      ["Website", s.website],
                      ["Branche", s.industry],
                      ["Region", s.region],
                      ["Werbebudget pro Monat", s.monthly_ad_budget],
                      ["Leistungen", s.services?.join(", ")],
                    ].map(([k, v]) => (
                      <div key={k as string}>
                        <dt className="text-[11px] uppercase tracking-wide text-neutral-400">{k}</dt>
                        <dd className="break-words text-neutral-800">{valueText(v)}</dd>
                      </div>
                    ))}
                    {answers.map(([k, v]) => (
                      <div key={k} className="sm:col-span-2">
                        <dt className="text-[11px] uppercase tracking-wide text-neutral-400">{keyLabel(k)}</dt>
                        <dd className="whitespace-pre-line break-words text-neutral-800">{valueText(v)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
