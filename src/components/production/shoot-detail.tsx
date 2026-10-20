"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ExternalLink, Minus, Plus, X } from "lucide-react";
import type { ShootDetail, ShootScript } from "@/server/services/production-crm.service";
import {
  addDateOptionAction,
  assignModelAction,
  deleteDateOptionAction,
  pickDateOptionAction,
  saveScriptAction,
  setAssignmentAction,
  setModelPaidAction,
  setOptionAvailabilityAction,
  setShootStageAction,
  updateShootDetailsAction,
} from "@/app/(app)/production/crm-actions";
import { formatCHF, cn } from "@/lib/utils";

type Person = { id: string; full_name: string | null };
type CreatorOpt = { id: string; first_name: string; last_name: string | null; city: string | null };

const TZ = "Europe/Zurich";
const dLong = new Intl.DateTimeFormat("de-CH", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
const dOpt = new Intl.DateTimeFormat("de-CH", { timeZone: TZ, weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const dDate = new Intl.DateTimeFormat("de-CH", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" });

/** Ablauf eines Shootings, in dieser Reihenfolge. */
const STAGES = [
  { key: "date_search", label: "Terminsuche" },
  { key: "planned", label: "Geplant" },
  { key: "confirmed", label: "Bestätigt" },
  { key: "done", label: "Gedreht" },
  { key: "editing", label: "Schnitt" },
  { key: "delivered", label: "Geliefert" },
];
const TYPES = [
  { key: "monthly", label: "Monats-Shooting" },
  { key: "launch", label: "Launch" },
  { key: "other", label: "Einzel-Shooting" },
];
const INVOICE = [
  { key: "open", label: "Noch nicht verrechnet" },
  { key: "invoiced", label: "Verrechnet" },
  { key: "paid", label: "Bezahlt" },
  { key: "none", label: "Nicht verrechnen" },
];
const ASSIGN = [
  { key: "requested", label: "Angefragt" },
  { key: "confirmed", label: "Zugesagt" },
  { key: "rejected", label: "Abgesagt" },
  { key: "done", label: "Durchgeführt" },
];
const SCRIPT = [
  { key: "draft", label: "Entwurf" },
  { key: "review", label: "Beim Kunden" },
  { key: "approved", label: "Freigegeben" },
];

/** ISO -> Wert fuer <input type="datetime-local"> in Lokalzeit des Browsers. */
function toLocal(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
const input = "h-9 w-full rounded-lg border border-neutral-200 bg-white px-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";
const href = (u: string) => (/^https?:\/\//.test(u) ? u : `https://${u}`);

/** Szenen-Skript wie im Kunden-CRM: {"version":1,"scenes":[{scene,image,speech}]}. */
type Scene = { scene: string; image: string; speech: string };
function parseScenes(script: string | null | undefined): Scene[] | null {
  if (!script || !script.trim().startsWith("{")) return null;
  try {
    const j = JSON.parse(script) as { scenes?: Array<Partial<Scene>> };
    if (!Array.isArray(j.scenes)) return null;
    return j.scenes.map((x, i) => ({ scene: String(x.scene ?? String(i + 1).padStart(2, "0")), image: String(x.image ?? ""), speech: String(x.speech ?? "") }));
  } catch {
    return null;
  }
}
const serializeScenes = (scenes: Scene[]) =>
  JSON.stringify({ version: 1, scenes: scenes.filter((x) => x.image.trim() || x.speech.trim()).map((x, i) => ({ ...x, scene: String(i + 1).padStart(2, "0") })) });

function ScenesTable({ scenes }: { scenes: Scene[] }) {
  return (
    <table className="mt-1 w-full text-sm">
      <thead className="text-left text-[11px] uppercase tracking-wide text-neutral-400">
        <tr>
          <th className="w-10 py-1 font-medium">Nr.</th>
          <th className="w-2/5 py-1 font-medium">Bild</th>
          <th className="py-1 font-medium">Sprechertext</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-neutral-100 align-top">
        {scenes.map((x) => (
          <tr key={x.scene}>
            <td className="py-1.5 tabular-nums text-neutral-400">{x.scene}</td>
            <td className="whitespace-pre-line py-1.5 pr-3 text-neutral-600">{x.image}</td>
            <td className="whitespace-pre-line py-1.5 text-neutral-800">{x.speech}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Card({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-neutral-200 bg-white", className)}>
      <header className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
        {action}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Tri({ value, onChange, label }: { value: boolean | null; onChange: (v: boolean | null) => void; label: string }) {
  const next = value === null ? true : value ? false : null;
  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      aria-label={`${label}: ${value === null ? "offen" : value ? "kann" : "kann nicht"}`}
      title={`${label}: ${value === null ? "offen" : value ? "kann" : "kann nicht"} (klicken zum Ändern)`}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs",
        value === true && "border-emerald-200 bg-emerald-50 text-emerald-800",
        value === false && "border-rose-200 bg-rose-50 text-rose-700",
        value === null && "border-neutral-200 text-neutral-500",
      )}
    >
      {value === true ? <Check className="h-3.5 w-3.5" aria-hidden /> : value === false ? <X className="h-3.5 w-3.5" aria-hidden /> : <Minus className="h-3.5 w-3.5" aria-hidden />}
      {label}
    </button>
  );
}

export function ShootDetailView({ shoot, users, creators }: { shoot: ShootDetail; users: Person[]; creators: CreatorOpt[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [model, setModel] = useState("");
  const [scriptOpen, setScriptOpen] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? r.message ?? null : r.error ?? "Fehler");
      if (r.ok) router.refresh();
    });

  const stageIdx = STAGES.findIndex((s) => s.key === shoot.status);
  const off = shoot.status === "cancelled" || shoot.status === "rescheduled";
  const date = shoot.shooting_date ? new Date(shoot.shooting_date) : null;
  const assigned = new Set(shoot.assignments.map((a) => a.creator?.id));
  const links = [
    { l: "Skript", u: shoot.script_url },
    { l: "Kunden-Drive", u: shoot.customer_drive_url },
    { l: "Shooting-Ordner", u: shoot.shoot_folder_url },
    { l: "Lieferung", u: shoot.delivery_url },
  ].filter((x): x is { l: string; u: string } => !!x.u);

  return (
    <div className="space-y-5">
      <Link href="/production/shoots" className="inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Alle Shootings
      </Link>

      <header className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-brand-700">{TYPES.find((t) => t.key === shoot.shoot_type)?.label ?? "Shooting"}</p>
            <h1 className="mt-0.5 text-xl font-semibold text-neutral-900">{shoot.title}</h1>
            <p className="mt-1 text-sm text-neutral-600">
              {shoot.client ? (
                <Link href={`/clients/${shoot.client.id}`} className="hover:text-brand-700">
                  {shoot.client.name}
                </Link>
              ) : (
                "eCreator intern"
              )}
              {" · "}
              {date ? dLong.format(date) : "Termin offen"}
              {shoot.duration_hours ? ` · ${shoot.duration_hours} Std.` : ""}
              {date && shoot.final_date_set === false ? <span className="ml-1 text-amber-700">(noch nicht fix)</span> : null}
            </p>
          </div>
          <select
            aria-label="Sonderstatus"
            value={off ? shoot.status : ""}
            disabled={pending}
            onChange={(e) => e.target.value && run(() => setShootStageAction(shoot.id, e.target.value))}
            className="h-8 rounded-lg border border-neutral-200 bg-white px-2 text-xs text-neutral-600"
          >
            <option value="">Verschieben / absagen…</option>
            <option value="rescheduled">Verschoben</option>
            <option value="cancelled">Abgesagt</option>
          </select>
        </div>
        {/* Ablauf: jede Phase anklickbar */}
        <ol className="mt-5 grid grid-cols-3 gap-1 sm:grid-cols-6" aria-label="Ablauf">
          {STAGES.map((s, i) => {
            const done = !off && i < stageIdx;
            const current = !off && i === stageIdx;
            return (
              <li key={s.key}>
                <button
                  type="button"
                  disabled={pending || current}
                  onClick={() => run(() => setShootStageAction(shoot.id, s.key))}
                  aria-current={current ? "step" : undefined}
                  className={cn(
                    "w-full border-t-4 pt-1.5 text-left text-xs transition-colors",
                    current ? "border-brand-600 font-semibold text-brand-800" : done ? "border-brand-300 text-neutral-700" : "border-neutral-200 text-neutral-400 hover:border-neutral-300 hover:text-neutral-700",
                  )}
                >
                  {s.label}
                </button>
              </li>
            );
          })}
        </ol>
        {off ? <p className="mt-2 text-xs font-medium text-rose-700">Status: {shoot.status === "cancelled" ? "Abgesagt" : "Verschoben"}. Eine Phase anklicken, um fortzufahren.</p> : null}
        {msg ? <p className="mt-3 text-xs text-neutral-600" role="status">{msg}</p> : null}
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card title="Terminvorschläge">
            {shoot.options.length ? (
              <ul className="divide-y divide-neutral-100">
                {shoot.options.map((o) => {
                  const both = o.customer_available && o.model_available;
                  const chosen = shoot.shooting_date && new Date(shoot.shooting_date).getTime() === new Date(o.starts_at).getTime();
                  return (
                    <li key={o.id} className="flex flex-wrap items-center gap-2 py-2">
                      <span className={cn("min-w-[9.5rem] text-sm tabular-nums", chosen ? "font-semibold text-brand-800" : "text-neutral-800")}>{dOpt.format(new Date(o.starts_at))}</span>
                      <Tri label="Kunde" value={o.customer_available} onChange={(v) => run(() => setOptionAvailabilityAction(shoot.id, o.id, "customer", v))} />
                      <Tri label="Model" value={o.model_available} onChange={(v) => run(() => setOptionAvailabilityAction(shoot.id, o.id, "model", v))} />
                      <span className="flex-1" />
                      {chosen ? (
                        <span className="text-xs font-medium text-brand-700">Festgelegt</span>
                      ) : (
                        <button type="button" disabled={pending} onClick={() => run(() => pickDateOptionAction(shoot.id, o.id))} className={cn("h-7 rounded-md px-2.5 text-xs font-medium", both ? "bg-brand-600 text-white hover:bg-brand-700" : "border border-neutral-200 text-neutral-700 hover:bg-neutral-50")}>
                          Als Termin festlegen
                        </button>
                      )}
                      <button type="button" aria-label="Vorschlag entfernen" disabled={pending} onClick={() => run(() => deleteDateOptionAction(shoot.id, o.id))} className="h-7 w-7 rounded-md text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700">
                        <X className="mx-auto h-4 w-4" aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-neutral-500">Noch keine Vorschläge. Schlage zwei bis drei Termine vor und halte fest, wer kann.</p>
            )}
            <form
              className="mt-3 flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!newDate) return;
                const iso = new Date(newDate).toISOString();
                run(async () => {
                  const r = await addDateOptionAction(shoot.id, iso);
                  if (r.ok) setNewDate("");
                  return r;
                });
              }}
            >
              <label className="sr-only" htmlFor="opt-date">Neuer Terminvorschlag</label>
              <input id="opt-date" type="datetime-local" value={newDate} onChange={(e) => setNewDate(e.target.value)} className={cn(input, "w-auto")} />
              <button type="submit" disabled={pending || !newDate} className="inline-flex h-9 items-center gap-1 rounded-lg border border-neutral-200 px-3 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">
                <Plus className="h-4 w-4" aria-hidden /> Vorschlagen
              </button>
            </form>
          </Card>

          <Card
            title={`Skripte (${shoot.scripts.length})`}
            action={
              <button type="button" onClick={() => setScriptOpen(scriptOpen === "new" ? null : "new")} className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
                <Plus className="h-3.5 w-3.5" aria-hidden /> Skript
              </button>
            }
          >
            {scriptOpen === "new" ? <ScriptForm pending={pending} next={(shoot.scripts.at(-1)?.video_number ?? shoot.scripts.length) + 1} onSave={(v) => run(async () => { const r = await saveScriptAction(shoot.id, null, v); if (r.ok) setScriptOpen(null); return r; })} onCancel={() => setScriptOpen(null)} /> : null}
            {shoot.scripts.length === 0 && scriptOpen !== "new" ? <p className="text-sm text-neutral-500">Noch keine Skripte. Pro Video ein Skript mit Hook, Inhalt und Call to Action.</p> : null}
            <ul className="space-y-3">
              {shoot.scripts.map((s) =>
                scriptOpen === s.id ? (
                  <li key={s.id}>
                    <ScriptForm pending={pending} initial={s} next={s.video_number ?? 1} onSave={(v) => run(async () => { const r = await saveScriptAction(shoot.id, s.id, v); if (r.ok) setScriptOpen(null); return r; })} onCancel={() => setScriptOpen(null)} />
                  </li>
                ) : (
                  <li key={s.id} className="rounded-lg border border-neutral-200 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-neutral-600">Video {s.video_number ?? "–"}</span>
                      <span className="flex-1 truncate text-sm font-medium text-neutral-900">{s.title ?? "Ohne Titel"}</span>
                      <select aria-label="Skript-Status" value={s.status} disabled={pending} onChange={(e) => run(() => saveScriptAction(shoot.id, s.id, { status: e.target.value as ShootScript["status"] }))} className="h-7 rounded-md border border-neutral-200 bg-white px-1.5 text-xs">
                        {SCRIPT.map((x) => (
                          <option key={x.key} value={x.key}>{x.label}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => setScriptOpen(s.id)} className="text-xs text-brand-700 hover:underline">Bearbeiten</button>
                    </div>
                    <dl className="mt-2 space-y-1.5 text-sm">
                      {s.hook ? (<div><dt className="text-[11px] uppercase tracking-wide text-neutral-400">Hook</dt><dd className="text-neutral-800">{s.hook}</dd></div>) : null}
                      {s.script ? (
                        <div>
                          <dt className="text-[11px] uppercase tracking-wide text-neutral-400">Skript</dt>
                          <dd className="text-neutral-700">{parseScenes(s.script) ? <ScenesTable scenes={parseScenes(s.script)!} /> : <span className="whitespace-pre-line">{s.script}</span>}</dd>
                        </div>
                      ) : null}
                      {s.cta ? (<div><dt className="text-[11px] uppercase tracking-wide text-neutral-400">Call to Action</dt><dd className="text-neutral-800">{s.cta}</dd></div>) : null}
                    </dl>
                  </li>
                ),
              )}
            </ul>
          </Card>

          {shoot.content_goal || shoot.notes || shoot.equipment ? (
            <Card title="Ziel und Notizen">
              <dl className="space-y-3 text-sm">
                {shoot.content_goal ? (<div><dt className="text-[11px] uppercase tracking-wide text-neutral-400">Content-Ziel</dt><dd className="whitespace-pre-line text-neutral-800">{shoot.content_goal}</dd></div>) : null}
                {shoot.equipment ? (<div><dt className="text-[11px] uppercase tracking-wide text-neutral-400">Equipment</dt><dd className="whitespace-pre-line text-neutral-800">{shoot.equipment}</dd></div>) : null}
                {shoot.notes ? (<div><dt className="text-[11px] uppercase tracking-wide text-neutral-400">Notizen</dt><dd className="whitespace-pre-line text-neutral-800">{shoot.notes}</dd></div>) : null}
              </dl>
            </Card>
          ) : null}
        </div>

        <div className="space-y-5">
          <Card title="Model">
            {shoot.assignments.length ? (
              <ul className="space-y-2">
                {shoot.assignments.map((a) => (
                  <li key={a.id} className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      {a.creator ? (
                        <Link href={`/production/creators/${a.creator.id}`} className="block truncate text-sm font-medium text-neutral-900 hover:text-brand-700">
                          {a.creator.first_name} {a.creator.last_name}
                        </Link>
                      ) : (
                        <span className="text-sm text-neutral-500">Creator entfernt</span>
                      )}
                      <p className="truncate text-xs text-neutral-500">{[a.creator?.city, a.agreed_rate != null ? formatCHF(a.agreed_rate) : null].filter(Boolean).join(" · ")}</p>
                    </div>
                    <select aria-label="Zusage" value={a.status} disabled={pending} onChange={(e) => run(() => setAssignmentAction(shoot.id, a.id, e.target.value))} className="h-7 rounded-md border border-neutral-200 bg-white px-1.5 text-xs">
                      {ASSIGN.map((x) => (
                        <option key={x.key} value={x.key}>{x.label}</option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-500">Noch kein Model angefragt.</p>
            )}
            <div className="mt-3 flex gap-2">
              <label className="sr-only" htmlFor="model-pick">Model anfragen</label>
              <select id="model-pick" value={model} onChange={(e) => setModel(e.target.value)} className={cn(input, "h-8 text-xs")}>
                <option value="">Model aus dem Pool wählen…</option>
                {creators.filter((c) => !assigned.has(c.id)).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name ?? ""}{c.city ? ` (${c.city})` : ""}
                  </option>
                ))}
              </select>
              <button type="button" disabled={pending || !model} onClick={() => run(async () => { const r = await assignModelAction(shoot.id, model, shoot.model_fee ?? null); if (r.ok) setModel(""); return r; })} className="h-8 shrink-0 rounded-lg bg-neutral-900 px-3 text-xs font-medium text-white disabled:opacity-40">
                Anfragen
              </button>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-2">
              <div>
                <p className="text-xs text-neutral-500">Model-Honorar</p>
                <p className="text-sm font-semibold tabular-nums text-neutral-900">{shoot.model_fee != null ? formatCHF(shoot.model_fee) : "nicht festgelegt"}</p>
              </div>
              {shoot.model_fee != null ? (
                <button type="button" disabled={pending} onClick={() => run(() => setModelPaidAction(shoot.id, !shoot.model_paid))} className={cn("h-8 rounded-lg px-2.5 text-xs font-medium", shoot.model_paid ? "border border-neutral-200 text-neutral-600" : "bg-emerald-600 text-white hover:bg-emerald-700")}>
                  {shoot.model_paid ? `Bezahlt${shoot.model_paid_at ? ` ${dDate.format(new Date(shoot.model_paid_at))}` : ""}` : "Als bezahlt markieren"}
                </button>
              ) : null}
            </div>
          </Card>

          <Card title="Eckdaten" action={<button type="button" onClick={() => setEditing((v) => !v)} className="text-xs font-medium text-brand-700 hover:underline">{editing ? "Schliessen" : "Bearbeiten"}</button>}>
            {editing ? (
              <DetailsForm shoot={shoot} users={users} pending={pending} onSave={(v) => run(async () => { const r = await updateShootDetailsAction(shoot.id, v); if (r.ok) setEditing(false); return r; })} />
            ) : (
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Ort", [shoot.location, shoot.address].filter(Boolean).join(", ") || "–"],
                  ["Videos", shoot.video_count ?? "–"],
                  ["Verantwortlich", shoot.responsible?.full_name ?? "–"],
                  ["Schnitt", shoot.editor?.full_name ?? "–"],
                  ["Videograf", shoot.videographer ?? "–"],
                  ["Lieferfrist", shoot.delivery_deadline ? dDate.format(new Date(`${shoot.delivery_deadline}T12:00:00`)) : "–"],
                  ["Rechnung", INVOICE.find((x) => x.key === shoot.invoice_status)?.label ?? "–"],
                  ["Geliefert", shoot.delivered_at ? dDate.format(new Date(shoot.delivered_at)) : "–"],
                ].map(([k, v]) => (
                  <div key={k as string} className="min-w-0">
                    <dt className="text-[11px] uppercase tracking-wide text-neutral-400">{k}</dt>
                    <dd className="truncate text-neutral-800">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
            {links.length && !editing ? (
              <ul className="mt-4 flex flex-wrap gap-2 border-t border-neutral-100 pt-3">
                {links.map((x) => (
                  <li key={x.l}>
                    <a href={href(x.u)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50">
                      {x.l} <ExternalLink className="h-3 w-3 text-neutral-400" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}

function ScriptForm({ initial, next, pending, onSave, onCancel }: { initial?: ShootScript; next: number; pending: boolean; onSave: (v: { title: string | null; video_number: number | null; hook: string | null; script: string | null; cta: string | null }) => void; onCancel: () => void }) {
  const [v, setV] = useState({ title: initial?.title ?? "", video_number: String(initial?.video_number ?? next), hook: initial?.hook ?? "", script: initial?.script ?? "", cta: initial?.cta ?? "" });
  const n = (s: string) => (s.trim() ? s.trim() : null);
  // Neue Skripte und Szenen-Skripte werden als Szenen bearbeitet, Fliesstext bleibt Fliesstext.
  const [scenes, setScenes] = useState<Scene[] | null>(() => (initial?.script ? parseScenes(initial.script) : [{ scene: "01", image: "", speech: "" }]));
  const setScene = (i: number, k: "image" | "speech", val: string) => setScenes((list) => list!.map((x, j) => (j === i ? { ...x, [k]: val } : x)));
  return (
    <form
      className="mb-3 space-y-2 rounded-lg border border-brand-200 bg-brand-50/30 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ title: n(v.title), video_number: Number(v.video_number) || null, hook: n(v.hook), script: scenes ? (scenes.some((x) => x.image.trim() || x.speech.trim()) ? serializeScenes(scenes) : null) : n(v.script), cta: n(v.cta) });
      }}
    >
      <div className="flex gap-2">
        <label className="w-20 shrink-0 text-xs text-neutral-600">
          Video
          <input type="number" min={1} value={v.video_number} onChange={(e) => setV({ ...v, video_number: e.target.value })} className={input} />
        </label>
        <label className="flex-1 text-xs text-neutral-600">
          Titel
          <input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} className={input} />
        </label>
      </div>
      <label className="block text-xs text-neutral-600">
        Hook (erste Sekunden)
        <input value={v.hook} onChange={(e) => setV({ ...v, hook: e.target.value })} className={input} />
      </label>
      {scenes ? (
        <fieldset className="space-y-1.5">
          <legend className="text-xs text-neutral-600">Szenen</legend>
          {scenes.map((x, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="w-6 pt-2 text-xs tabular-nums text-neutral-400">{String(i + 1).padStart(2, "0")}</span>
              <label className="flex-1 text-[11px] text-neutral-500">
                Bild
                <textarea rows={2} value={x.image} onChange={(e) => setScene(i, "image", e.target.value)} className={cn(input, "h-auto py-1.5")} />
              </label>
              <label className="flex-[1.4] text-[11px] text-neutral-500">
                Sprechertext
                <textarea rows={2} value={x.speech} onChange={(e) => setScene(i, "speech", e.target.value)} className={cn(input, "h-auto py-1.5")} />
              </label>
              <button type="button" aria-label={`Szene ${i + 1} entfernen`} onClick={() => setScenes((l) => (l!.length > 1 ? l!.filter((_, j) => j !== i) : l))} className="mt-5 h-7 w-7 rounded text-neutral-400 hover:bg-neutral-100">
                <X className="mx-auto h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setScenes((l) => [...l!, { scene: "", image: "", speech: "" }])} className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
            <Plus className="h-3.5 w-3.5" aria-hidden /> Szene
          </button>
        </fieldset>
      ) : (
        <label className="block text-xs text-neutral-600">
          Skript
          <textarea rows={5} value={v.script} onChange={(e) => setV({ ...v, script: e.target.value })} className={cn(input, "h-auto py-2")} />
        </label>
      )}
      <label className="block text-xs text-neutral-600">
        Call to Action
        <input value={v.cta} onChange={(e) => setV({ ...v, cta: e.target.value })} className={input} />
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="h-8 rounded-lg px-3 text-xs text-neutral-600 hover:bg-neutral-100">Abbrechen</button>
        <button type="submit" disabled={pending} className="h-8 rounded-lg bg-brand-600 px-3 text-xs font-medium text-white disabled:opacity-50">Skript speichern</button>
      </div>
    </form>
  );
}

function DetailsForm({ shoot, users, pending, onSave }: { shoot: ShootDetail; users: Person[]; pending: boolean; onSave: (v: Parameters<typeof updateShootDetailsAction>[1]) => void }) {
  const [v, setV] = useState({
    title: shoot.title,
    shooting_date: toLocal(shoot.shooting_date),
    duration_hours: shoot.duration_hours != null ? String(shoot.duration_hours) : "",
    shoot_type: shoot.shoot_type ?? "",
    location: shoot.location ?? "",
    address: shoot.address ?? "",
    video_count: shoot.video_count != null ? String(shoot.video_count) : "",
    responsible_id: shoot.responsible_id ?? "",
    editor_id: shoot.editor_id ?? "",
    videographer: shoot.videographer ?? "",
    delivery_deadline: shoot.delivery_deadline ?? "",
    model_fee: shoot.model_fee != null ? String(shoot.model_fee / 100) : "",
    invoice_status: (shoot.invoice_status ?? "open") as "open" | "invoiced" | "paid" | "none",
    content_goal: shoot.content_goal ?? "",
    script_url: shoot.script_url ?? "",
    customer_drive_url: shoot.customer_drive_url ?? "",
    shoot_folder_url: shoot.shoot_folder_url ?? "",
    delivery_url: shoot.delivery_url ?? "",
  });
  const n = (s: string) => (s.trim() ? s.trim() : null);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });
  const F = ({ k, label, type = "text", span }: { k: keyof typeof v; label: string; type?: string; span?: boolean }) => (
    <label className={cn("block text-xs text-neutral-600", span && "col-span-2")}>
      {label}
      <input type={type} value={v[k] as string} onChange={set(k)} className={input} />
    </label>
  );
  return (
    <form
      className="grid grid-cols-2 gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          title: v.title.trim() || shoot.title,
          shooting_date: v.shooting_date ? new Date(v.shooting_date).toISOString() : null,
          duration_hours: v.duration_hours ? Number(v.duration_hours) : null,
          shoot_type: n(v.shoot_type),
          location: n(v.location),
          address: n(v.address),
          video_count: v.video_count ? Number(v.video_count) : null,
          responsible_id: v.responsible_id || null,
          editor_id: v.editor_id || null,
          videographer: n(v.videographer),
          delivery_deadline: v.delivery_deadline || null,
          model_fee: v.model_fee ? Math.round(Number(v.model_fee) * 100) : null,
          invoice_status: v.invoice_status,
          content_goal: n(v.content_goal),
          script_url: n(v.script_url),
          customer_drive_url: n(v.customer_drive_url),
          shoot_folder_url: n(v.shoot_folder_url),
          delivery_url: n(v.delivery_url),
        });
      }}
    >
      {F({ k: "title", label: "Titel", span: true })}
      {F({ k: "shooting_date", label: "Termin", type: "datetime-local", span: true })}
      {F({ k: "duration_hours", label: "Dauer (Std.)", type: "number" })}
      <label className="block text-xs text-neutral-600">
        Typ
        <select value={v.shoot_type} onChange={set("shoot_type")} className={input}>
          <option value="">–</option>
          {TYPES.map((t) => (<option key={t.key} value={t.key}>{t.label}</option>))}
        </select>
      </label>
      {F({ k: "location", label: "Ort" })}
      {F({ k: "address", label: "Adresse" })}
      {F({ k: "video_count", label: "Anzahl Videos", type: "number" })}
      {F({ k: "delivery_deadline", label: "Lieferfrist", type: "date" })}
      <label className="block text-xs text-neutral-600">
        Verantwortlich
        <select value={v.responsible_id} onChange={set("responsible_id")} className={input}>
          <option value="">–</option>
          {users.map((u) => (<option key={u.id} value={u.id}>{u.full_name}</option>))}
        </select>
      </label>
      <label className="block text-xs text-neutral-600">
        Schnitt
        <select value={v.editor_id} onChange={set("editor_id")} className={input}>
          <option value="">–</option>
          {users.map((u) => (<option key={u.id} value={u.id}>{u.full_name}</option>))}
        </select>
      </label>
      {F({ k: "videographer", label: "Videograf (extern)" })}
      {F({ k: "model_fee", label: "Model-Honorar (CHF)", type: "number" })}
      <label className="col-span-2 block text-xs text-neutral-600">
        Rechnung an Kunden
        <select value={v.invoice_status} onChange={set("invoice_status")} className={input}>
          {INVOICE.map((x) => (<option key={x.key} value={x.key}>{x.label}</option>))}
        </select>
      </label>
      <label className="col-span-2 block text-xs text-neutral-600">
        Content-Ziel
        <textarea rows={2} value={v.content_goal} onChange={set("content_goal")} className={cn(input, "h-auto py-2")} />
      </label>
      {F({ k: "script_url", label: "Link Skript", span: true })}
      {F({ k: "customer_drive_url", label: "Link Kunden-Drive", span: true })}
      {F({ k: "shoot_folder_url", label: "Link Shooting-Ordner", span: true })}
      {F({ k: "delivery_url", label: "Link Lieferung", span: true })}
      <div className="col-span-2 flex justify-end pt-1">
        <button type="submit" disabled={pending} className="h-9 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white disabled:opacity-50">Eckdaten speichern</button>
      </div>
    </form>
  );
}
