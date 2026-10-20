"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Lightbulb, Plus, X } from "lucide-react";
import type { ContentItem, ContentPlan } from "@/server/services/production-crm.service";
import { createContentItemAction, rescheduleContentAction, setContentStatusAction, setPlanStatusAction } from "@/app/(app)/production/crm-actions";
import { CONTENT_PROJECT_STATUSES } from "@/config/catalog";
import { cn } from "@/lib/utils";

const TZ = "Europe/Zurich";
const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const PLATFORM: Record<string, string> = { instagram: "IG", tiktok: "TT", linkedin: "LI", youtube: "YT", facebook: "FB", other: "··" };
const PLATFORM_NAME: Record<string, string> = { instagram: "Instagram", tiktok: "TikTok", linkedin: "LinkedIn", youtube: "YouTube", facebook: "Facebook", other: "Sonstige" };
const DOT: Record<string, string> = { gray: "bg-neutral-400", blue: "bg-sky-500", amber: "bg-amber-500", green: "bg-emerald-600" };
const PLAN_STATUS = [
  { key: "planning", label: "In Planung" },
  { key: "in_review", label: "Beim Kunden" },
  { key: "approved", label: "Freigegeben" },
  { key: "done", label: "Umgesetzt" },
];
const statusOf = (k: string) => CONTENT_PROJECT_STATUSES.find((s) => s.key === k);
const DONE = new Set(["approved", "scheduled", "published"]);

/** YYYY-MM-DD in Zuercher Zeit. */
function dayKey(iso: string) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
  return p;
}
const time = new Intl.DateTimeFormat("de-CH", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
function shift(month: string, by: number) {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
const input = "h-9 rounded-lg border border-neutral-200 bg-white px-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export function ContentCalendar({ month, items, backlog, plans, clients }: { month: string; items: ContentItem[]; backlog: ContentItem[]; plans: ContentPlan[]; clients: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [scope, setScope] = useState<"all" | "client" | "ecreator">("all");
  const [clientId, setClientId] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null); // Datum (YYYY-MM-DD) oder "idea"
  const [msg, setMsg] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? r.message ?? null : r.error ?? "Fehler");
      if (r.ok) router.refresh();
    });

  const [y, m] = month.split("-").map(Number) as [number, number];
  const filterFn = (i: ContentItem) => (scope === "all" || (scope === "ecreator" ? i.workspace === "ecreator" : i.workspace !== "ecreator")) && (!clientId || i.client_id === clientId);
  const monthItems = useMemo(() => items.filter((i) => i.scheduled_for && dayKey(i.scheduled_for).startsWith(month)).filter(filterFn), [items, month, scope, clientId]); // eslint-disable-line react-hooks/exhaustive-deps
  const byDay = useMemo(() => {
    const map = new Map<string, ContentItem[]>();
    for (const i of monthItems) {
      const k = dayKey(i.scheduled_for!);
      map.set(k, [...(map.get(k) ?? []), i]);
    }
    return map;
  }, [monthItems]);
  const ideas = backlog.filter(filterFn);

  // Raster: Montag vor dem 1. bis Sonntag nach dem Monatsende
  const first = new Date(Date.UTC(y, m - 1, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells = Array.from({ length: Math.ceil((lead + days) / 7) * 7 }, (_, i) => {
    const d = i - lead + 1;
    return d >= 1 && d <= days ? `${month}-${String(d).padStart(2, "0")}` : null;
  });
  const today = dayKey(new Date().toISOString());
  const sel = [...items, ...backlog].find((i) => i.id === selected) ?? null;
  const published = monthItems.filter((i) => i.status === "published").length;
  const ready = monthItems.filter((i) => DONE.has(i.status)).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={`?monat=${shift(month, -1)}`} aria-label="Vormonat" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50">
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Link>
          <h2 className="min-w-[10rem] text-center text-lg font-semibold text-neutral-900">
            {MONTHS[m - 1]} {y}
          </h2>
          <Link href={`?monat=${shift(month, 1)}`} aria-label="Nächster Monat" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50">
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
          <p className="ml-2 hidden text-sm text-neutral-500 md:block">
            {monthItems.length} Beiträge · {ready} bereit · {published} veröffentlicht
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-neutral-200 bg-white p-0.5 text-xs" role="group" aria-label="Kanäle">
            {([["all", "Alle"], ["client", "Kunden"], ["ecreator", "eCreator"]] as const).map(([k, l]) => (
              <button key={k} type="button" aria-pressed={scope === k} onClick={() => setScope(k)} className={cn("rounded-md px-2.5 py-1", scope === k ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-50")}>
                {l}
              </button>
            ))}
          </div>
          <label className="sr-only" htmlFor="cc-client">Kunde</label>
          <select id="cc-client" value={clientId} onChange={(e) => setClientId(e.target.value)} className={cn(input, "h-8 text-xs")}>
            <option value="">Alle Kunden</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button type="button" onClick={() => setAdding(adding ? null : `${month}-${String(Math.min(days, Math.max(1, Number(today.slice(8))))).padStart(2, "0")}`)} className="inline-flex h-8 items-center gap-1 rounded-lg bg-brand-600 px-3 text-xs font-medium text-white hover:bg-brand-700">
            <Plus className="h-3.5 w-3.5" aria-hidden /> Beitrag planen
          </button>
        </div>
      </div>

      {adding ? <AddForm date={adding} clients={clients} pending={pending} defaultClient={clientId} onCancel={() => setAdding(null)} onSave={(v) => run(async () => { const r = await createContentItemAction(v); if (r.ok) setAdding(null); return r; })} /> : null}
      {msg ? <p className="text-xs text-neutral-600" role="status">{msg}</p> : null}

      {/* Kalender */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <div className="grid min-w-[760px] grid-cols-7">
          {WEEKDAYS.map((w) => (
            <div key={w} className="border-b border-neutral-100 px-2 py-2 text-[11px] font-medium uppercase tracking-wide text-neutral-400">{w}</div>
          ))}
          {cells.map((d, i) => {
            const list = d ? byDay.get(d) ?? [] : [];
            return (
              <div key={i} className={cn("group min-h-[104px] border-b border-r border-neutral-100 p-1.5 [&:nth-child(7n)]:border-r-0", !d && "bg-neutral-50/60", d && d < today && "bg-neutral-50/30")}>
                {d ? (
                  <div className="mb-1 flex items-center justify-between">
                    <span className={cn("inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs tabular-nums", d === today ? "bg-brand-600 font-semibold text-white" : "text-neutral-500")}>{Number(d.slice(8))}</span>
                    <button type="button" aria-label={`Beitrag am ${Number(d.slice(8))}. planen`} onClick={() => setAdding(d)} className="h-6 w-6 rounded text-neutral-300 opacity-0 hover:bg-neutral-100 hover:text-neutral-600 focus:opacity-100 group-hover:opacity-100">
                      <Plus className="mx-auto h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                ) : null}
                <ul className="space-y-1">
                  {list.map((it) => {
                    const st = statusOf(it.status);
                    return (
                      <li key={it.id}>
                        <button
                          type="button"
                          onClick={() => setSelected(selected === it.id ? null : it.id)}
                          aria-pressed={selected === it.id}
                          title={`${it.title ?? ""} · ${st?.label ?? it.status}${it.client ? ` · ${it.client.name}` : ""}`}
                          className={cn("flex w-full items-center gap-1 rounded-md border px-1.5 py-1 text-left text-[11px] leading-tight", selected === it.id ? "border-brand-400 bg-brand-50" : "border-neutral-200 bg-white hover:border-neutral-300")}
                        >
                          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT[st?.color ?? "gray"])} aria-hidden />
                          <span className="shrink-0 font-semibold text-neutral-500">{PLATFORM[it.platform ?? ""] ?? "··"}</span>
                          <span className="truncate text-neutral-800">{it.title}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {sel ? (
        <section className="rounded-xl border border-brand-200 bg-white p-4" aria-label="Ausgewählter Beitrag">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-neutral-500">
                {[sel.client?.name ?? "eCreator-Kanal", PLATFORM_NAME[sel.platform ?? ""] ?? sel.platform, sel.format, sel.scheduled_for ? `${dayKey(sel.scheduled_for).split("-").reverse().join(".")} ${time.format(new Date(sel.scheduled_for))}` : "ohne Datum"].filter(Boolean).join(" · ")}
              </p>
              <h3 className="mt-0.5 text-base font-semibold text-neutral-900">{sel.title}</h3>
              {sel.topic && sel.topic !== sel.title ? <p className="text-sm text-neutral-600">Thema: {sel.topic}</p> : null}
              {sel.hook ? <p className="text-sm text-neutral-600">Hook: {sel.hook}</p> : null}
              <p className="mt-1 text-xs text-neutral-400">Verantwortlich: {sel.owner?.full_name ?? "niemand"}</p>
            </div>
            <button type="button" aria-label="Schliessen" onClick={() => setSelected(null)} className="h-8 w-8 rounded-lg text-neutral-400 hover:bg-neutral-50">
              <X className="mx-auto h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="sel-status">Status</label>
            <select id="sel-status" value={sel.status} disabled={pending} onChange={(e) => run(() => setContentStatusAction(sel.id, e.target.value))} className={cn(input, "h-8 text-xs")}>
              {CONTENT_PROJECT_STATUSES.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
            <label className="sr-only" htmlFor="sel-date">Datum</label>
            <input
              id="sel-date"
              type="date"
              defaultValue={sel.scheduled_for ? dayKey(sel.scheduled_for) : ""}
              onChange={(e) => {
                if (!e.target.value) return;
                const hm = sel.scheduled_for ? time.format(new Date(sel.scheduled_for)) : "09:00";
                const iso = new Date(`${e.target.value}T${hm}`).toISOString();
                run(() => rescheduleContentAction(sel.id, iso));
              }}
              className={cn(input, "h-8 text-xs")}
            />
            {sel.scheduled_for ? (
              <button type="button" disabled={pending} onClick={() => run(() => rescheduleContentAction(sel.id, null))} className="h-8 rounded-lg border border-neutral-200 px-2.5 text-xs text-neutral-600 hover:bg-neutral-50">
                In den Ideenspeicher
              </button>
            ) : null}
            <Link href={`/production/content/${sel.id}`} className="ml-auto text-xs font-medium text-brand-700 hover:underline">
              Alle Details
            </Link>
          </div>
        </section>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-neutral-200 bg-white">
          <header className="border-b border-neutral-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-neutral-900">Redaktionspläne {MONTHS[m - 1]}</h3>
            <p className="text-xs text-neutral-500">Ein Plan pro Kunde und Monat, Freigabe durch den Kunden.</p>
          </header>
          {plans.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-neutral-400">Für diesen Monat gibt es keine Pläne.</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {plans.map((p) => {
                const its = items.filter((i) => i.plan_id === p.id);
                const ok = its.filter((i) => DONE.has(i.status)).length;
                return (
                  <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <button type="button" onClick={() => setClientId(p.client_id ?? "")} className="truncate text-left text-sm font-medium text-neutral-900 hover:text-brand-700">
                        {p.client?.name ?? "Ohne Kunde"}
                      </button>
                      <p className="text-xs text-neutral-500">
                        {its.length} Beiträge · {ok} bereit · {p.responsible?.full_name ?? "niemand verantwortlich"}
                      </p>
                      <div className="mt-1 h-1.5 w-full max-w-[200px] overflow-hidden rounded-full bg-neutral-100">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${its.length ? (ok / its.length) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <select aria-label={`Status Plan ${p.client?.name ?? ""}`} value={p.status} disabled={pending} onChange={(e) => run(() => setPlanStatusAction(p.id, e.target.value))} className={cn(input, "h-8 text-xs")}>
                      {PLAN_STATUS.map((s) => (
                        <option key={s.key} value={s.key}>{s.label}</option>
                      ))}
                    </select>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white">
          <header className="flex items-center justify-between gap-2 border-b border-neutral-100 px-4 py-3">
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
                <Lightbulb className="h-4 w-4 text-amber-500" aria-hidden /> Ideenspeicher <span className="font-normal tabular-nums text-neutral-400">{ideas.length}</span>
              </h3>
              <p className="text-xs text-neutral-500">Ideen ohne Datum. Datum setzen, um sie einzuplanen.</p>
            </div>
            <button type="button" onClick={() => setAdding("idea")} className="text-xs font-medium text-brand-700 hover:underline">
              Idee notieren
            </button>
          </header>
          {ideas.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-neutral-400">Keine offenen Ideen.</p>
          ) : (
            <ul className="max-h-80 divide-y divide-neutral-100 overflow-y-auto">
              {ideas.map((it) => (
                <li key={it.id} className="flex items-center gap-2 px-4 py-2">
                  <span className="w-6 shrink-0 text-[11px] font-semibold text-neutral-400">{PLATFORM[it.platform ?? ""] ?? "··"}</span>
                  <button type="button" onClick={() => setSelected(it.id)} className="min-w-0 flex-1 truncate text-left text-sm text-neutral-800 hover:text-brand-700">
                    {it.title}
                    <span className="ml-1.5 text-xs text-neutral-400">{it.client?.name ?? "eCreator"}</span>
                  </button>
                  <label className="sr-only" htmlFor={`idea-${it.id}`}>Einplanen am</label>
                  <input id={`idea-${it.id}`} type="date" onChange={(e) => e.target.value && run(() => rescheduleContentAction(it.id, new Date(`${e.target.value}T09:00`).toISOString()))} className={cn(input, "h-7 w-[8.5rem] text-xs")} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function AddForm({ date, clients, defaultClient, pending, onSave, onCancel }: { date: string; clients: Array<{ id: string; name: string }>; defaultClient: string; pending: boolean; onSave: (v: Parameters<typeof createContentItemAction>[0]) => void; onCancel: () => void }) {
  const idea = date === "idea";
  const [v, setV] = useState({ title: "", client_id: defaultClient, date: idea ? "" : date, time: "09:00", platform: "instagram", format: "Reel", topic: "" });
  return (
    <form
      className="grid gap-2 rounded-xl border border-brand-200 bg-brand-50/30 p-4 sm:grid-cols-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!v.title.trim()) return;
        onSave({
          title: v.title.trim(),
          client_id: v.client_id || null,
          scheduled_for: v.date ? new Date(`${v.date}T${v.time || "09:00"}`).toISOString() : null,
          platform: v.platform,
          format: v.format,
          topic: v.topic.trim() || null,
        });
      }}
    >
      <label className="text-xs text-neutral-600 sm:col-span-3">
        Titel
        <input autoFocus required value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} className={cn(input, "w-full")} />
      </label>
      <label className="text-xs text-neutral-600 sm:col-span-3">
        Kunde
        <select value={v.client_id} onChange={(e) => setV({ ...v, client_id: e.target.value })} className={cn(input, "w-full")}>
          <option value="">eCreator (eigene Kanäle)</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>
      <label className="text-xs text-neutral-600 sm:col-span-2">
        Datum
        <input type="date" value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} className={cn(input, "w-full")} />
      </label>
      <label className="text-xs text-neutral-600">
        Zeit
        <input type="time" value={v.time} onChange={(e) => setV({ ...v, time: e.target.value })} className={cn(input, "w-full")} />
      </label>
      <label className="text-xs text-neutral-600">
        Kanal
        <select value={v.platform} onChange={(e) => setV({ ...v, platform: e.target.value })} className={cn(input, "w-full")}>
          {Object.entries(PLATFORM_NAME).map(([k, l]) => (
            <option key={k} value={k}>{l}</option>
          ))}
        </select>
      </label>
      <label className="text-xs text-neutral-600 sm:col-span-2">
        Format
        <select value={v.format} onChange={(e) => setV({ ...v, format: e.target.value })} className={cn(input, "w-full")}>
          {["Reel", "Post", "Carousel", "Story", "Short"].map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </label>
      <label className="text-xs text-neutral-600 sm:col-span-4">
        Thema (optional)
        <input value={v.topic} onChange={(e) => setV({ ...v, topic: e.target.value })} className={cn(input, "w-full")} />
      </label>
      <div className="flex items-end justify-end gap-2 sm:col-span-2">
        <button type="button" onClick={onCancel} className="h-9 rounded-lg px-3 text-sm text-neutral-600 hover:bg-neutral-100">Abbrechen</button>
        <button type="submit" disabled={pending} className="h-9 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white disabled:opacity-50">{v.date ? "Einplanen" : "Als Idee speichern"}</button>
      </div>
    </form>
  );
}
