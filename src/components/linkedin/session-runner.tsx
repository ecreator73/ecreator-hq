"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Flame,
  Linkedin,
  Loader2,
  PartyPopper,
  Reply,
  SkipForward,
  Timer,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import {
  LINKEDIN_PROSPECT_STATUSES,
  statusLabel,
  type LinkedInProspectStatus,
  type LinkedInTemplateCategory,
} from "@/config/catalog";
import { HOT_PROSPECT_THRESHOLD, prospectTemplateVariables } from "@/lib/linkedin";
import { renderTemplate } from "@/lib/ai-prompt";
import {
  moveProspectAction,
  updateProspectAction,
  createLinkedinMessageAction,
} from "@/app/(app)/sales/linkedin/actions";
import { formatDate, cn } from "@/lib/utils";
import type {
  LinkedInProspectWithRelations,
  LinkedInMessageTemplate,
} from "@/types/entities";

/* ------------------------------------------------------------------ Steps */

interface PrimaryStep {
  label: string;
  /** "move" = Statuswechsel (Follow-up-Automatik greift); "reschedule" = Datum schieben. */
  kind: "move" | "reschedule";
  target?: LinkedInProspectStatus;
  days?: number;
  /** Nachricht (falls Text vorhanden) als "gesendet" im CRM ablegen? */
  savesMessage: boolean;
}

interface StepConfig {
  hint: string;
  templateCategory: LinkedInTemplateCategory | null;
  primary: PrimaryStep;
  showReplyButton: boolean;
}

const STEPS: Record<string, StepConfig> = {
  neu: {
    hint: "Profil pruefen und Kontaktanfrage senden (Notiz optional, max. 300 Zeichen).",
    templateCategory: "erste_kontaktanfrage",
    primary: { label: "Kontaktanfrage gesendet", kind: "move", target: "kontaktanfrage_gesendet", savesMessage: true },
    showReplyButton: false,
  },
  zu_recherchieren: {
    hint: "Recherche kurz abschliessen, dann Kontaktanfrage senden.",
    templateCategory: "erste_kontaktanfrage",
    primary: { label: "Kontaktanfrage gesendet", kind: "move", target: "kontaktanfrage_gesendet", savesMessage: true },
    showReplyButton: false,
  },
  kontaktanfrage_gesendet: {
    hint: "Pruefen, ob die Anfrage angenommen wurde.",
    templateCategory: "nach_annahme",
    primary: { label: "Verbunden — Anfrage angenommen", kind: "move", target: "verbunden", savesMessage: false },
    showReplyButton: false,
  },
  verbunden: {
    hint: "Erste Nachricht senden (personalisiert, kein Verkaufstext).",
    templateCategory: "nach_annahme",
    primary: { label: "Erste Nachricht gesendet", kind: "move", target: "erste_nachricht_gesendet", savesMessage: true },
    showReplyButton: true,
  },
  erste_nachricht_gesendet: {
    hint: "Noch keine Antwort? Freundliches Follow-up senden.",
    templateCategory: "followup",
    primary: { label: "Follow-up gesendet (+7 Tage)", kind: "reschedule", days: 7, savesMessage: true },
    showReplyButton: true,
  },
  antwort_erhalten: {
    hint: "Antworten und ein Gespraech vorschlagen.",
    templateCategory: "nach_gespraech",
    primary: { label: "Termin vereinbart", kind: "move", target: "termin_vereinbart", savesMessage: true },
    showReplyButton: false,
  },
  termin_vereinbart: {
    hint: "Termin vorbereiten bzw. nach dem Gespraech Angebot senden.",
    templateCategory: "nach_gespraech",
    primary: { label: "Angebot gesendet", kind: "move", target: "angebot", savesMessage: true },
    showReplyButton: true,
  },
  angebot: {
    hint: "Angebot nachfassen.",
    templateCategory: "nach_angebot",
    primary: { label: "Gewonnen!", kind: "move", target: "gewonnen", savesMessage: false },
    showReplyButton: true,
  },
  spaeter_kontaktieren: {
    hint: "Reaktivierung: kurzes Update-Angebot senden.",
    templateCategory: "reaktivierung",
    primary: { label: "Reaktivierung gesendet (+14 Tage)", kind: "reschedule", days: 14, savesMessage: true },
    showReplyButton: true,
  },
};

const FALLBACK_STEP: StepConfig = {
  hint: "Naechsten Schritt waehlen.",
  templateCategory: "followup",
  primary: { label: "Erledigt (+3 Tage)", kind: "reschedule", days: 3, savesMessage: false },
  showReplyButton: true,
};

const plusDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const todayIso = () => new Date().toISOString().slice(0, 10);

/* ------------------------------------------------------------------ Runner */

export function SessionRunner({
  queue,
  templates,
  overdueCount,
  todayCount,
}: {
  queue: LinkedInProspectWithRelations[];
  templates: LinkedInMessageTemplate[];
  overdueCount: number;
  todayCount: number;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Array<{ name: string; action: string }>>([]);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [templateId, setTemplateId] = useState<string>("");
  const [text, setText] = useState("");

  const prospect = queue[index];
  const step = prospect ? (STEPS[prospect.status] ?? FALLBACK_STEP) : FALLBACK_STEP;

  // Passende Standard-Vorlage je Status vorwaehlen + sofort personalisieren.
  useEffect(() => {
    if (!prospect) return;
    const preferred =
      templates.find((t) => t.category === step.templateCategory) ??
      templates[0] ??
      null;
    setTemplateId(preferred?.id ?? "");
    setText(
      preferred
        ? renderTemplate(preferred.body, prospectTemplateVariables(prospect), { keepMissing: true }).text
        : "",
    );
    setCopied(false);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, prospect?.id]);

  function pickTemplate(id: string) {
    setTemplateId(id);
    const tpl = templates.find((t) => t.id === id);
    if (tpl && prospect) {
      setText(renderTemplate(tpl.body, prospectTemplateVariables(prospect), { keepMissing: true }).text);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Kopieren nicht moeglich - Text manuell markieren.");
    }
  }

  function advance(action: string) {
    if (prospect) setResults((r) => [...r, { name: prospect.full_name, action }]);
    setIndex((i) => i + 1);
  }

  /** Nachricht (falls vorhanden) als gesendet ablegen - loggt auch die Aktivitaet. */
  async function saveMessageIfAny(): Promise<boolean> {
    if (!prospect || text.trim() === "") return true;
    const r = await createLinkedinMessageAction({
      prospect_id: prospect.id,
      template_id: templateId || undefined,
      body: text,
      direction: "out",
      status: "sent",
    });
    if (!r.ok) {
      setError(r.error);
      return false;
    }
    return true;
  }

  function runPrimary() {
    if (!prospect) return;
    start(async () => {
      if (step.primary.savesMessage && !(await saveMessageIfAny())) return;
      if (step.primary.kind === "move" && step.primary.target) {
        const r = await moveProspectAction(prospect.id, step.primary.target);
        if (!r.ok) { setError(r.error); return; }
      } else {
        const r = await updateProspectAction(prospect.id, {
          next_followup_date: plusDays(step.primary.days ?? 3),
        });
        if (!r.ok) { setError(r.error); return; }
      }
      router.refresh();
      advance(step.primary.label);
    });
  }

  function runMove(target: LinkedInProspectStatus, label: string) {
    if (!prospect) return;
    start(async () => {
      const r = await moveProspectAction(prospect.id, target);
      if (!r.ok) { setError(r.error); return; }
      router.refresh();
      advance(label);
    });
  }

  function postpone(days: number) {
    if (!prospect) return;
    start(async () => {
      const r = await updateProspectAction(prospect.id, {
        next_followup_date: plusDays(days),
      });
      if (!r.ok) { setError(r.error); return; }
      router.refresh();
      advance(`Verschoben (+${days} Tage)`);
    });
  }

  /* ------------------------------------------------------------ Zustaende */

  if (queue.length === 0) {
    return (
      <EmptyState
        icon={PartyPopper}
        title="Nichts faellig - alles im Griff!"
        description="Heute sind keine Follow-ups offen. Neue Prospects anlegen oder importieren, um die Pipeline zu fuellen."
        action={
          <Link
            href="/sales/linkedin/prospects"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white hover:bg-brand-700"
          >
            Zu den Prospects <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
    );
  }

  if (!prospect) {
    // Session abgeschlossen
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <PartyPopper className="mx-auto h-8 w-8 text-emerald-600" />
          <h2 className="mt-2 text-lg font-semibold text-emerald-800">
            Session abgeschlossen!
          </h2>
          <p className="mt-1 text-sm text-emerald-700">
            {results.length} Prospect(s) abgearbeitet. Follow-ups wurden
            automatisch neu geplant.
          </p>
        </div>
        <Card>
          <CardContent className="divide-y divide-neutral-100 p-0">
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span className="min-w-0 flex-1 truncate font-medium text-neutral-800">
                  {r.name}
                </span>
                <span className="text-xs text-neutral-500">{r.action}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="flex justify-center">
          <Link
            href="/sales/linkedin"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white hover:bg-brand-700"
          >
            Zum Dashboard <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  const overdue = Boolean(
    prospect.next_followup_date && prospect.next_followup_date < todayIso(),
  );
  const hot = prospect.lead_score >= HOT_PROSPECT_THRESHOLD;
  const isConnectionNote = step.templateCategory === "erste_kontaktanfrage";
  const subtitle = [prospect.position, prospect.company_name]
    .filter(Boolean)
    .join(" @ ");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Fortschritt */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-1.5 font-medium text-neutral-800">
            <Zap className="h-4 w-4 text-brand-500" /> Tages-Session
          </span>
          <span className="text-neutral-500">
            {index + 1} von {queue.length}
            {overdueCount > 0 ? ` · ${overdueCount} ueberfaellig` : ""}
            {todayCount > 0 ? ` · ${todayCount} heute` : ""}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200">
          <div
            className="h-full rounded-full bg-brand-500 transition-all"
            style={{ width: `${Math.round((index / queue.length) * 100)}%` }}
          />
        </div>
      </div>

      {/* Prospect-Karte */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/sales/linkedin/prospects/${prospect.id}`}
                className="text-xl font-semibold tracking-tight text-neutral-900 hover:text-brand-700"
              >
                {prospect.full_name}
              </Link>
              <StatusBadge
                label={statusLabel("linkedin_prospect", prospect.status)}
                color={
                  LINKEDIN_PROSPECT_STATUSES.find((s) => s.key === prospect.status)
                    ?.color
                }
              />
              {hot ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  <Flame className="h-3.5 w-3.5" /> Hot · {prospect.lead_score}
                </span>
              ) : null}
              {overdue ? <Badge tone="red">Ueberfaellig</Badge> : null}
            </div>
            {subtitle ? (
              <p className="mt-0.5 text-sm text-neutral-500">{subtitle}</p>
            ) : null}
            <p className="mt-0.5 text-xs text-neutral-400">
              {[prospect.industry, prospect.location, prospect.campaign?.name]
                .filter(Boolean)
                .join(" · ") || " "}
              {prospect.next_followup_date
                ? ` · Follow-up: ${formatDate(prospect.next_followup_date)}`
                : ""}
            </p>
          </div>
          {prospect.linkedin_url ? (
            <a
              href={prospect.linkedin_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-[#0A66C2] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#004182]"
            >
              <Linkedin className="h-4 w-4" /> Profil oeffnen
              <ExternalLink className="h-3.5 w-3.5 opacity-70" />
            </a>
          ) : (
            <span className="inline-flex h-10 items-center rounded-lg border border-dashed border-neutral-300 px-3 text-sm text-neutral-400">
              Keine LinkedIn-URL
            </span>
          )}
        </div>

        <p className="mt-3 rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
          👉 {step.hint}
        </p>

        {/* Nachricht */}
        <div className="mt-4">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Personalisierte Nachricht
            </label>
            <select
              value={templateId}
              onChange={(e) => pickTemplate(e.target.value)}
              className="h-8 rounded-lg border border-neutral-200 bg-white px-2 text-xs focus:border-brand-500 focus:outline-none"
            >
              {templates.length === 0 ? (
                <option value="">Keine Vorlagen</option>
              ) : null}
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={Math.min(8, Math.max(3, text.split("\n").length + 1))}
            className="block w-full resize-y rounded-lg border border-neutral-200 px-3 py-2 text-sm leading-relaxed focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <div className="mt-1.5 flex items-center justify-between">
            <button
              type="button"
              onClick={copy}
              disabled={text.trim() === ""}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 hover:border-brand-300 disabled:opacity-50"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? "Kopiert!" : "Nachricht kopieren"}
            </button>
            {isConnectionNote ? (
              <span
                className={cn(
                  "text-xs",
                  text.length > 300 ? "font-medium text-red-600" : "text-neutral-400",
                )}
              >
                {text.length}/300 Zeichen (LinkedIn-Notiz-Limit)
              </span>
            ) : null}
          </div>
        </div>

        {error ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {/* Aktionen */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-4">
          <button
            type="button"
            onClick={runPrimary}
            disabled={pending}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {step.primary.label}
          </button>
          {step.showReplyButton ? (
            <button
              type="button"
              onClick={() => runMove("antwort_erhalten", "Antwort erhalten")}
              disabled={pending}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
            >
              <Reply className="h-4 w-4" /> Antwort erhalten
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => postpone(3)}
            disabled={pending}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 hover:border-brand-300 disabled:opacity-50"
          >
            <Timer className="h-4 w-4" /> +3 Tage
          </button>
          <div className="ml-auto flex items-center gap-2">
            <select
              value=""
              onChange={(e) => {
                const v = e.target.value as LinkedInProspectStatus;
                if (v) runMove(v, `Status: ${statusLabel("linkedin_prospect", v)}`);
              }}
              disabled={pending}
              className="h-10 rounded-lg border border-neutral-200 bg-white px-2 text-sm text-neutral-600 focus:border-brand-500 focus:outline-none"
              aria-label="Anderen Status setzen"
            >
              <option value="">Anderer Status …</option>
              {LINKEDIN_PROSPECT_STATUSES.filter(
                (s) => s.key !== prospect.status,
              ).map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => advance("Uebersprungen")}
              disabled={pending}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-neutral-500 hover:bg-neutral-100 disabled:opacity-50"
            >
              <SkipForward className="h-4 w-4" /> Ueberspringen
            </button>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-neutral-400">
        Kein Auto-Versand: Nachricht kopieren und persoenlich ueber LinkedIn
        senden - das System plant danach automatisch das naechste Follow-up.
      </p>
    </div>
  );
}
