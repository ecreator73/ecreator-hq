"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Search } from "lucide-react";
import type { CreatorApplication } from "@/server/services/production-crm.service";
import { decideApplicationAction } from "@/app/(app)/production/crm-actions";
import { CREATOR_LANGUAGES } from "@/config/catalog";
import { cn } from "@/lib/utils";

const STATUS = [
  { key: "new", label: "Neu", hint: "noch nicht angeschaut" },
  { key: "reviewing", label: "In Prüfung", hint: "wird angeschaut" },
  { key: "on_hold", label: "Warteliste", hint: "passt später vielleicht" },
  { key: "accepted", label: "Angenommen", hint: "im Creator Pool" },
  { key: "rejected", label: "Abgelehnt", hint: "" },
] as const;
const LANG: Record<string, string> = Object.fromEntries(CREATOR_LANGUAGES.map((l) => [l.key, l.label]));
const df = new Intl.DateTimeFormat("de-CH", { timeZone: "Europe/Zurich", day: "2-digit", month: "2-digit", year: "numeric" });
const url = (u: string) => (/^https?:\/\//.test(u) ? u : `https://${u}`);
const thisYear = new Date().getFullYear();

export function ApplicationsBoard({ applications, initialStatus, media = {} }: { applications: CreatorApplication[]; initialStatus?: string; media?: Record<string, string> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tab, setTab] = useState<string>(STATUS.some((s) => s.key === initialStatus) ? initialStatus! : applications.some((a) => a.status === "new") ? "new" : "reviewing");
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<{ id: string; text: string } | null>(null);
  const counts = useMemo(() => Object.fromEntries(STATUS.map((s) => [s.key, applications.filter((a) => a.status === s.key).length])), [applications]);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return applications.filter((a) => a.status === tab && (!t || [a.first_name, a.last_name, a.city, a.instagram_handle].some((v) => v?.toLowerCase().includes(t))));
  }, [applications, tab, q]);

  // Herkunft und Annahmequote (alle Bewerbungen)
  const decided = counts.accepted + counts.rejected;
  const fromAds = applications.filter((a) => a.utm_medium === "paid").length;
  const last30 = applications.filter((a) => Date.now() - Date.parse(a.created_at) < 30 * 86_400_000).length;

  function decide(a: CreatorApplication, status: string) {
    start(async () => {
      const r = await decideApplicationAction(a.id, status);
      setMsg({ id: a.id, text: r.ok ? r.message ?? "Gespeichert" : r.error });
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { l: "Bewerbungen", v: applications.length, s: `${last30} in den letzten 30 Tagen` },
          { l: "Offen", v: counts.new + counts.reviewing, s: `${counts.new} neu, ${counts.reviewing} in Prüfung`, t: counts.new ? "text-amber-700" : undefined },
          { l: "Annahmequote", v: decided ? `${Math.round((counts.accepted / decided) * 100)} %` : "–", s: `${counts.accepted} angenommen, ${counts.rejected} abgelehnt` },
          { l: "Über Werbung", v: applications.length ? `${Math.round((fromAds / applications.length) * 100)} %` : "–", s: "bezahlte Kampagnen (UTM)" },
        ].map((k) => (
          <div key={k.l} className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs text-neutral-500">{k.l}</p>
            <p className={cn("mt-1 text-2xl font-semibold tabular-nums text-neutral-900", k.t)}>{k.v}</p>
            <p className="text-xs text-neutral-400">{k.s}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg border border-neutral-200 bg-white p-0.5" role="tablist" aria-label="Bewerbungsstatus">
          {STATUS.map((s) => (
            <button key={s.key} type="button" role="tab" aria-selected={tab === s.key} onClick={() => setTab(s.key)} className={cn("rounded-md px-3 py-1.5 text-sm", tab === s.key ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-50")}>
              {s.label} <span className={cn("ml-1 tabular-nums", tab === s.key ? "text-neutral-300" : "text-neutral-400")}>{counts[s.key]}</span>
            </button>
          ))}
        </div>
        <label className="relative">
          <span className="sr-only">Bewerbungen durchsuchen</span>
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, Ort, Instagram" className="h-9 w-56 rounded-lg border border-neutral-200 bg-white pl-8 pr-2.5 text-sm" />
        </label>
      </div>

      {list.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 bg-white px-4 py-10 text-center text-sm text-neutral-500">Keine Bewerbungen in «{STATUS.find((s) => s.key === tab)?.label}».</p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {list.map((a) => {
            const age = a.birth_year ? thisYear - a.birth_year : null;
            const photo = a.photo_file ? media[a.photo_file] : undefined;
            const video = a.video_file ? media[a.video_file] : undefined;
            const photoIsPdf = /\.pdf$/i.test(a.photo_file ?? "");
            return (
              <li key={a.id} className="flex flex-col rounded-xl border border-neutral-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  {photo && !photoIsPdf ? (
                    <a href={photo} target="_blank" rel="noopener noreferrer" className="shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo} alt={`Foto von ${a.first_name}`} loading="lazy" className="h-16 w-14 rounded-lg border border-neutral-200 object-cover" />
                    </a>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-neutral-900">
                      {a.first_name} {a.last_name}
                      {age ? <span className="ml-2 text-sm font-normal text-neutral-500">{age} J.</span> : null}
                    </p>
                    <p className="truncate text-sm text-neutral-500">{[a.city, a.languages.map((l) => LANG[l] ?? l).join(", ")].filter(Boolean).join(" · ")}</p>
                  </div>
                  <span className="shrink-0 text-xs text-neutral-400">{df.format(new Date(a.created_at))}</span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-neutral-400">Erfahrung</dt>
                    <dd className="text-neutral-800">{a.experience ?? "–"}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-neutral-400">Honorarvorstellung</dt>
                    <dd className="text-neutral-800">{a.rate_expectation ?? "–"}</dd>
                  </div>
                </dl>
                {a.about ? <p className="mt-3 line-clamp-3 text-sm text-neutral-700">{a.about}</p> : null}
                <div className="mb-4 mt-3 flex flex-wrap gap-2 text-xs">
                  {a.instagram_handle ? (
                    <a href={`https://instagram.com/${a.instagram_handle}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-neutral-700 hover:bg-neutral-50">
                      Instagram <ExternalLink className="h-3 w-3 text-neutral-400" aria-hidden />
                    </a>
                  ) : null}
                  {a.tiktok_handle ? (
                    <a href={`https://www.tiktok.com/@${a.tiktok_handle}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-neutral-700 hover:bg-neutral-50">
                      TikTok <ExternalLink className="h-3 w-3 text-neutral-400" aria-hidden />
                    </a>
                  ) : null}
                  {a.portfolio_url ? (
                    <a href={url(a.portfolio_url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-neutral-700 hover:bg-neutral-50">
                      Portfolio <ExternalLink className="h-3 w-3 text-neutral-400" aria-hidden />
                    </a>
                  ) : null}
                  {video ? (
                    <a href={video} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-neutral-700 hover:bg-neutral-50">
                      Video ansehen <ExternalLink className="h-3 w-3 text-neutral-400" aria-hidden />
                    </a>
                  ) : null}
                  {photo && photoIsPdf ? (
                    <a href={photo} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-neutral-700 hover:bg-neutral-50">
                      Sedcard (PDF) <ExternalLink className="h-3 w-3 text-neutral-400" aria-hidden />
                    </a>
                  ) : null}
                  {(a.photo_path && !a.photo_file) || (a.video_path && !a.video_file) ? (
                    <span className="rounded-md bg-neutral-50 px-2 py-1 text-neutral-500">
                      {a.status === "rejected" ? "Unterlagen nicht übernommen (abgelehnt)" : "Unterlagen noch im alten CRM"}
                    </span>
                  ) : null}
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
                  {a.status === "accepted" && a.creator_id ? (
                    <Link href={`/production/creators/${a.creator_id}`} className="h-8 rounded-lg bg-neutral-900 px-3 text-xs font-medium leading-8 text-white">
                      Zum Creator-Profil
                    </Link>
                  ) : (
                    <button type="button" disabled={pending} onClick={() => decide(a, "accepted")} className="h-8 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                      Annehmen
                    </button>
                  )}
                  {a.status !== "reviewing" && a.status !== "accepted" ? (
                    <button type="button" disabled={pending} onClick={() => decide(a, "reviewing")} className="h-8 rounded-lg border border-neutral-200 px-3 text-xs text-neutral-700 hover:bg-neutral-50">
                      In Prüfung
                    </button>
                  ) : null}
                  {a.status !== "on_hold" && a.status !== "accepted" ? (
                    <button type="button" disabled={pending} onClick={() => decide(a, "on_hold")} className="h-8 rounded-lg border border-neutral-200 px-3 text-xs text-neutral-700 hover:bg-neutral-50">
                      Warteliste
                    </button>
                  ) : null}
                  {a.status !== "rejected" && a.status !== "accepted" ? (
                    <button type="button" disabled={pending} onClick={() => decide(a, "rejected")} className="h-8 rounded-lg px-3 text-xs text-rose-700 hover:bg-rose-50">
                      Ablehnen
                    </button>
                  ) : null}
                  <span className="ml-auto text-xs text-neutral-400">
                    {a.rejection_email_sent_at ? "Absage-Mail versendet" : a.on_hold_email_sent_at ? "Warteliste-Mail versendet" : ""}
                  </span>
                </div>
                {msg?.id === a.id ? <p className="mt-2 text-xs text-neutral-600" role="status">{msg.text}</p> : null}
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs text-neutral-400">Statuswechsel verschicken keine E-Mails. Absage- und Warteliste-Mails liefen bisher über das alte CRM.</p>
    </div>
  );
}
