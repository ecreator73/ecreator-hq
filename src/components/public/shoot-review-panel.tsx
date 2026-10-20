"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCircle2, Loader2, Send, X } from "lucide-react";
import { changeRequestAction, confirmDatesAction, customerAvailabilityAction, scriptDecisionAction } from "@/app/(public)/shoot-review/actions";
import { parseScenes } from "@/lib/scenes";
import { ScenesTable } from "@/components/production/scenes-table";
import { cn } from "@/lib/utils";

type Option = { id: string; starts_at: string; customer_available: boolean | null };
type Script = { id: string; video_number: number | null; title: string | null; hook: string | null; script: string | null; cta: string | null; status: string; customer_feedback: string | null; customer_decided_at: string | null };
const dOpt = new Intl.DateTimeFormat("de-CH", { timeZone: "Europe/Zurich", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
const area = "mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export function ShootReviewPanel({ token, dateFixed, options, scripts }: { token: string; dateFixed: boolean; options: Option[]; scripts: Script[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<Record<string, string>>({});
  const run = (key: string, fn: () => Promise<{ ok: boolean; message?: string; error?: string }>, ok?: string) =>
    start(async () => {
      const r = await fn();
      setMsg((m) => ({ ...m, [key]: r.ok ? r.message ?? ok ?? "" : r.error ?? "Fehler" }));
      if (r.ok) router.refresh();
    });

  return (
    <div className="mt-10 space-y-10">
      {!dateFixed && options.length ? (
        <section aria-labelledby="dates">
          <h2 id="dates" className="text-xl font-semibold">
            Terminvorschläge
          </h2>
          <p className="mt-1 text-sm text-neutral-600">Bitte markieren Sie, welche Termine für Sie passen. Wir bestätigen danach den definitiven Termin.</p>
          <ul className="mt-4 divide-y divide-neutral-200 rounded-xl border border-neutral-200">
            {options.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <span className="font-medium">{dOpt.format(new Date(o.starts_at))}</span>
                <span className="flex gap-2">
                  <button type="button" disabled={pending} aria-pressed={o.customer_available === true} onClick={() => run("dates", () => customerAvailabilityAction(token, o.id, true))} className={cn("inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-sm", o.customer_available === true ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-neutral-300 hover:bg-neutral-50")}>
                    <Check className="h-4 w-4" aria-hidden /> Passt
                  </button>
                  <button type="button" disabled={pending} aria-pressed={o.customer_available === false} onClick={() => run("dates", () => customerAvailabilityAction(token, o.id, false))} className={cn("inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-sm", o.customer_available === false ? "border-rose-300 bg-rose-50 text-rose-800" : "border-neutral-300 hover:bg-neutral-50")}>
                    <X className="h-4 w-4" aria-hidden /> Passt nicht
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" disabled={pending || options.every((o) => o.customer_available == null)} onClick={() => run("dates", () => confirmDatesAction(token))} className="h-10 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white disabled:opacity-40">
              Auswahl senden
            </button>
            {msg.dates ? <span className="text-sm text-neutral-600" role="status">{msg.dates}</span> : null}
          </div>
        </section>
      ) : null}

      {scripts.length ? (
        <section aria-labelledby="scripts">
          <h2 id="scripts" className="text-xl font-semibold">
            Skripte
          </h2>
          <p className="mt-1 text-sm text-neutral-600">Bitte prüfen Sie die Skripte. Geben Sie sie frei oder schreiben Sie uns, was wir anpassen sollen.</p>
          <ul className="mt-4 space-y-4">
            {scripts.map((s) => (
              <ScriptCard key={s.id} s={s} pending={pending} message={msg[s.id]} onDecide={(d, fb) => run(s.id, () => scriptDecisionAction(token, s.id, d, fb), d === "approved" ? "Freigegeben, danke!" : "Danke, wir passen das Skript an.")} />
            ))}
          </ul>
        </section>
      ) : null}

      <ChangeRequest token={token} />
    </div>
  );
}

function ScriptCard({ s, pending, message, onDecide }: { s: Script; pending: boolean; message?: string; onDecide: (d: "approved" | "changes", feedback: string) => void }) {
  const [fb, setFb] = useState("");
  const [open, setOpen] = useState(false);
  const scenes = parseScenes(s.script);
  const approved = s.status === "approved";
  return (
    <li className="rounded-2xl border border-neutral-200 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">
          Video {s.video_number ?? "–"}
          {s.title ? ` · ${s.title}` : ""}
        </p>
        {approved ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Freigegeben
          </span>
        ) : s.customer_feedback ? (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">Änderung gewünscht</span>
        ) : null}
      </div>
      <dl className="mt-3 space-y-2 text-sm">
        {s.hook ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-500">Hook</dt>
            <dd>{s.hook}</dd>
          </div>
        ) : null}
        {s.script ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-500">Skript</dt>
            <dd>{scenes ? <ScenesTable scenes={scenes} /> : <span className="whitespace-pre-line">{s.script}</span>}</dd>
          </div>
        ) : null}
        {s.cta ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-500">Call to Action</dt>
            <dd>{s.cta}</dd>
          </div>
        ) : null}
      </dl>
      {s.customer_feedback ? <p className="mt-3 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-700">Ihre Rückmeldung: {s.customer_feedback}</p> : null}
      {!approved ? (
        <div className="mt-4">
          {open ? (
            <div>
              <label className="block text-sm font-medium">
                Was sollen wir ändern?
                <textarea rows={3} value={fb} onChange={(e) => setFb(e.target.value)} maxLength={3000} className={area} />
              </label>
              <div className="mt-2 flex gap-2">
                <button type="button" disabled={pending || fb.trim().length < 3} onClick={() => onDecide("changes", fb)} className="h-10 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white disabled:opacity-40">
                  Rückmeldung senden
                </button>
                <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-lg px-3 text-sm text-neutral-600 hover:bg-neutral-100">
                  Abbrechen
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={pending} onClick={() => onDecide("approved", "")} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                <Check className="h-4 w-4" aria-hidden /> Freigeben
              </button>
              <button type="button" onClick={() => setOpen(true)} className="h-10 rounded-lg border border-neutral-300 px-4 text-sm hover:bg-neutral-50">
                Änderung wünschen
              </button>
            </div>
          )}
        </div>
      ) : null}
      {message ? <p className="mt-2 text-sm text-neutral-600" role="status">{message}</p> : null}
    </li>
  );
}

function ChangeRequest({ token }: { token: string }) {
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  return (
    <section aria-labelledby="wishes" className="rounded-2xl bg-neutral-50 p-5 sm:p-6">
      <h2 id="wishes" className="text-xl font-semibold">
        Anpassungswünsche
      </h2>
      <p className="mt-1 text-sm text-neutral-600">Möchten Sie etwas geändert haben? Ihre Nachricht geht direkt an Ihre Ansprechperson bei eCreator.</p>
      {sent ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-white p-4" role="status">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
          <div>
            <p className="font-medium">Danke, Ihre Wünsche sind angekommen.</p>
            <p className="text-sm text-neutral-600">Wir melden uns, sobald die Anpassungen umgesetzt sind.</p>
            <button type="button" onClick={() => setSent(false)} className="mt-2 text-sm font-medium text-brand-700 hover:underline">
              Weiteren Wunsch senden
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium">
            Ihr Name (optional)
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className={cn(area, "h-11 py-0")} />
          </label>
          <label className="block text-sm font-medium">
            Was sollen wir anpassen?
            <textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} maxLength={5000} placeholder="z. B. Video 2: Musik leiser, Logo am Ende länger einblenden …" className={area} />
          </label>
          {error ? <p className="text-sm text-rose-700" role="alert">{error}</p> : null}
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              const r = await changeRequestAction(token, name, text);
              setBusy(false);
              if (!r.ok) return setError(r.error);
              setText("");
              setSent(true);
            }}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-5 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />} Wünsche senden
          </button>
        </div>
      )}
    </section>
  );
}
