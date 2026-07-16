"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  Copy,
  FileText,
  Loader2,
  MessageSquare,
  Paperclip,
  Phone,
  Reply,
  Send,
  Sparkles,
  Trash2,
  Users,
  StickyNote,
  Handshake,
  UserPlus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { LINKEDIN_ACTIVITY_TYPE_LABELS } from "@/config/catalog";
import {
  createProspectActivityAction,
  personalizeMessageAction,
  createLinkedinMessageAction,
  updateLinkedinMessageAction,
  deleteLinkedinMessageAction,
  updateProspectAction,
} from "@/app/(app)/sales/linkedin/actions";
import { formatDate, cn } from "@/lib/utils";
import type {
  LinkedInActivity,
  LinkedInMessage,
  LinkedInMessageTemplate,
  TaskWithRelations,
} from "@/types/entities";

/* ========================================================== Aktivitaeten */

const QUICK_LOG: Array<{
  type: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { type: "kontaktanfrage", label: "Kontaktanfrage", icon: UserPlus },
  { type: "nachricht", label: "Nachricht", icon: MessageSquare },
  { type: "antwort", label: "Antwort", icon: Reply },
  { type: "telefonat", label: "Telefonat", icon: Phone },
  { type: "meeting", label: "Meeting", icon: Users },
  { type: "notiz", label: "Notiz", icon: StickyNote },
  { type: "angebot", label: "Angebot", icon: Handshake },
];

export function ActivitiesTab({
  prospectId,
  activities,
}: {
  prospectId: string;
  activities: LinkedInActivity[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [text, setText] = useState("");

  function log(type: string) {
    start(async () => {
      const r = await createProspectActivityAction({
        prospect_id: prospectId,
        type: type as never,
        subject:
          LINKEDIN_ACTIVITY_TYPE_LABELS[
            type as keyof typeof LINKEDIN_ACTIVITY_TYPE_LABELS
          ] ?? type,
        body: text.trim() === "" ? undefined : text,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setError(null);
      setText("");
      setSelected(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Schnell-Logger */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <h3 className="mb-2 text-sm font-semibold text-neutral-900">
            Aktivitaet erfassen
          </h3>
          <div className="flex flex-wrap gap-2">
            {QUICK_LOG.map((q) => (
              <button
                key={q.type}
                type="button"
                onClick={() => setSelected(selected === q.type ? null : q.type)}
                disabled={pending}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors disabled:opacity-50",
                  selected === q.type
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-neutral-200 bg-white text-neutral-700 hover:border-brand-300",
                )}
              >
                <q.icon className="h-4 w-4" /> {q.label}
              </button>
            ))}
          </div>
          {selected ? (
            <div className="mt-3 space-y-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                autoFocus
                placeholder="Optional: kurze Notiz zum Vorgang …"
                className="block w-full resize-y rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => log(selected)}
                  disabled={pending}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {pending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Erfassen
                </button>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="text-sm text-neutral-500 hover:text-neutral-800"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          ) : null}
          {error ? (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          ) : null}
        </CardContent>
      </Card>

      {/* Timeline */}
      {activities.length === 0 ? (
        <EmptyState
          title="Noch keine Aktivitaeten"
          description="Kontaktanfragen, Nachrichten, Telefonate und Statuswechsel erscheinen hier chronologisch."
        />
      ) : (
        <Card>
          <CardContent className="p-4 sm:p-5">
            <ol className="relative space-y-4 border-l border-neutral-200 pl-4">
              {activities.map((a) => (
                <li key={a.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-400" />
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-sm font-medium text-neutral-900">
                      {a.subject ??
                        LINKEDIN_ACTIVITY_TYPE_LABELS[
                          a.type as keyof typeof LINKEDIN_ACTIVITY_TYPE_LABELS
                        ] ??
                        a.type}
                    </span>
                    <Badge tone="neutral">
                      {LINKEDIN_ACTIVITY_TYPE_LABELS[
                        a.type as keyof typeof LINKEDIN_ACTIVITY_TYPE_LABELS
                      ] ?? a.type}
                    </Badge>
                    <span className="text-xs text-neutral-400">
                      {formatDate(a.occurred_at)}
                      {a.author?.full_name ? ` · ${a.author.full_name}` : ""}
                    </span>
                  </div>
                  {a.body ? (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">
                      {a.body}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ============================================================ Nachrichten */

export function MessagesTab({
  prospectId,
  messages,
  templates,
}: {
  prospectId: string;
  messages: LinkedInMessage[];
  templates: LinkedInMessageTemplate[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState("");
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");

  const grouped = useMemo(() => {
    const byCat = new Map<string, LinkedInMessageTemplate[]>();
    for (const t of templates.filter((t) => t.active)) {
      const list = byCat.get(t.category) ?? [];
      list.push(t);
      byCat.set(t.category, list);
    }
    return [...byCat.entries()];
  }, [templates]);

  function personalize() {
    if (!templateId) return;
    start(async () => {
      const r = await personalizeMessageAction(prospectId, templateId);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setError(
        r.data && r.data.missing.length
          ? `Entwurf erstellt - fehlende Angaben: ${r.data.missing.join(", ")} (Platzhalter im Text pruefen).`
          : null,
      );
      router.refresh();
    });
  }

  function saveReply() {
    if (replyText.trim() === "") return;
    start(async () => {
      const r = await createLinkedinMessageAction({
        prospect_id: prospectId,
        body: replyText,
        direction: "in",
        status: "received",
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setError(null);
      setReplyText("");
      setReplyOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        Kein automatischer Versand: Entwurf pruefen, kopieren und persoenlich
        ueber LinkedIn senden - danach hier als gesendet markieren.
      </div>

      {/* Personalisieren + Antwort erfassen */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-4 sm:p-5">
          <Sparkles className="h-4 w-4 shrink-0 text-brand-500" />
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="h-9 min-w-[14rem] flex-1 rounded-lg border border-neutral-300 bg-white px-2.5 text-sm focus:border-brand-500 focus:outline-none"
          >
            <option value="">Vorlage waehlen …</option>
            {grouped.map(([cat, list]) => (
              <optgroup
                key={cat}
                label={list[0] ? labelForCategory(cat) : cat}
              >
                {list.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button
            type="button"
            onClick={personalize}
            disabled={pending || !templateId}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Personalisieren
          </button>
          <button
            type="button"
            onClick={() => setReplyOpen((v) => !v)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 hover:border-brand-300"
          >
            <Reply className="h-4 w-4" /> Antwort erfassen
          </button>
        </CardContent>
      </Card>

      {replyOpen ? (
        <Card>
          <CardContent className="space-y-2 p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-neutral-900">
              Erhaltene Antwort dokumentieren
            </h3>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={4}
              autoFocus
              placeholder="Antwort des Prospects einfuegen …"
              className="block w-full resize-y rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <button
              type="button"
              onClick={saveReply}
              disabled={pending || replyText.trim() === ""}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              <Check className="h-4 w-4" /> Speichern
            </button>
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </div>
      ) : null}

      {messages.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Noch keine Nachrichten"
          description="Vorlage personalisieren, pruefen, kopieren und persoenlich ueber LinkedIn senden."
        />
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <MessageCard key={m.id} message={m} />
          ))}
        </div>
      )}
    </div>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  erste_kontaktanfrage: "Erste Kontaktanfrage",
  nach_annahme: "Nach Annahme",
  followup: "Follow-up",
  nach_gespraech: "Nach Gespraech",
  nach_angebot: "Nach Angebot",
  reaktivierung: "Reaktivierung",
};
function labelForCategory(key: string): string {
  return CATEGORY_LABELS[key] ?? key;
}

function MessageCard({ message }: { message: LinkedInMessage }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [body, setBody] = useState(message.body);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDraft = message.status === "draft";
  const dirty = body !== message.body;

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    start(async () => {
      const r = await fn();
      if (!r.ok) {
        setError(r.error ?? "Fehler");
        return;
      }
      setError(null);
      router.refresh();
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Kopieren nicht moeglich - Text manuell markieren.");
    }
  }

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {message.direction === "in" ? (
            <Badge tone="green">Antwort erhalten</Badge>
          ) : isDraft ? (
            <Badge tone="amber">Entwurf</Badge>
          ) : (
            <Badge tone="brand">Gesendet</Badge>
          )}
          <span className="text-xs text-neutral-400">
            {formatDate(message.sent_at ?? message.created_at)}
          </span>
        </div>

        {isDraft ? (
          <>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={Math.min(10, Math.max(3, body.split("\n").length + 1))}
              className="block w-full resize-y rounded-lg border border-neutral-200 px-3 py-2 text-sm leading-relaxed focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {dirty ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    run(() => updateLinkedinMessageAction(message.id, { body }))
                  }
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-600 px-2.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" /> Speichern
                </button>
              ) : null}
              <button
                type="button"
                onClick={copy}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 text-xs font-medium text-neutral-700 hover:border-brand-300"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Kopiert!" : "Kopieren"}
              </button>
              <button
                type="button"
                disabled={pending || dirty}
                title={dirty ? "Zuerst speichern" : undefined}
                onClick={() =>
                  run(() =>
                    updateLinkedinMessageAction(message.id, { status: "sent" }),
                  )
                }
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" /> Als gesendet markieren
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (window.confirm("Entwurf loeschen?"))
                    run(() => deleteLinkedinMessageAction(message.id));
                }}
                className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                aria-label="Loeschen"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
            {message.body}
          </p>
        )}
        {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      </CardContent>
    </Card>
  );
}

/* ================================================================ Notizen */

export function NotesTab({
  prospectId,
  notes,
}: {
  prospectId: string;
  notes: string | null;
}) {
  const router = useRouter();
  const [val, setVal] = useState(notes ?? "");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const dirty = val !== (notes ?? "");

  function save() {
    start(async () => {
      const r = await updateProspectAction(prospectId, {
        notes_md: val.trim() === "" ? null : val,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setError(null);
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 1500);
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-900">
              Notizen (Markdown)
            </h3>
            {saved ? (
              <span className="text-xs text-emerald-600">Gespeichert</span>
            ) : dirty ? (
              <button
                type="button"
                onClick={save}
                disabled={pending}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline disabled:opacity-50"
              >
                {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                Speichern
              </button>
            ) : null}
          </div>
          <textarea
            value={val}
            onChange={(e) => setVal(e.target.value)}
            rows={16}
            placeholder={
              "# Gespraechsnotizen\n\n- [ ] Website analysieren\n- [x] Profil geprueft\n\n**Wichtig:** …"
            }
            className="block w-full resize-y rounded-lg border border-neutral-200 px-3 py-2 font-mono text-sm leading-relaxed focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
          <p className="mt-2 text-[11px] text-neutral-400">
            Unterstuetzt: # Ueberschriften, - Listen, - [ ] Checklisten,
            **fett**
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 sm:p-5">
          <h3 className="mb-2 text-sm font-semibold text-neutral-900">
            Vorschau
          </h3>
          {val.trim() === "" ? (
            <p className="text-sm text-neutral-400">Noch keine Notizen.</p>
          ) : (
            <MarkdownPreview text={val} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Bewusst kleiner Markdown-Renderer (Ueberschriften, Listen, Checklisten,
 *  Fett) - ohne Dependency, reicht fuer Gespraechsnotizen. */
function MarkdownPreview({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  return (
    <div className="space-y-1 text-sm leading-relaxed text-neutral-700">
      {lines.map((line, i) => {
        const h = line.match(/^(#{1,3})\s+(.*)$/);
        if (h) {
          const level = h[1]!.length;
          return (
            <p
              key={i}
              className={cn(
                "font-semibold text-neutral-900",
                level === 1 ? "mt-2 text-base" : level === 2 ? "mt-2 text-sm" : "mt-1 text-sm",
              )}
            >
              {renderBold(h[2]!)}
            </p>
          );
        }
        const check = line.match(/^-\s+\[( |x|X)\]\s+(.*)$/);
        if (check) {
          const done = check[1]!.toLowerCase() === "x";
          return (
            <p key={i} className="flex items-start gap-2">
              <span
                className={cn(
                  "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]",
                  done
                    ? "border-emerald-300 bg-emerald-50 text-emerald-600"
                    : "border-neutral-300 bg-white text-transparent",
                )}
              >
                ✓
              </span>
              <span className={done ? "text-neutral-400 line-through" : ""}>
                {renderBold(check[2]!)}
              </span>
            </p>
          );
        }
        const li = line.match(/^-\s+(.*)$/);
        if (li) {
          return (
            <p key={i} className="flex items-start gap-2">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-neutral-400" />
              <span>{renderBold(li[1]!)}</span>
            </p>
          );
        }
        if (line.trim() === "") return <div key={i} className="h-2" />;
        return <p key={i}>{renderBold(line)}</p>;
      })}
    </div>
  );
}

function renderBold(s: string): React.ReactNode {
  const parts = s.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="font-semibold text-neutral-900">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

/* =============================================================== Aufgaben */

export function TasksTab({ tasks }: { tasks: TaskWithRelations[] }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-4">
      <p className="text-xs text-neutral-500">
        Follow-up-Aufgaben entstehen automatisch bei jedem Statuswechsel
        (z.B. 3 Tage nach Kontaktanfrage, 7 Tage nach erster Nachricht).
      </p>
      {tasks.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Keine Aufgaben zu diesem Prospect"
          description="Beim naechsten Statuswechsel wird automatisch ein Follow-up erstellt."
        />
      ) : (
        <Card>
          <CardContent className="divide-y divide-neutral-100 p-0">
            {tasks.map((t) => {
              const done = t.status?.key === "done" || t.status?.key === "archived";
              const overdue = !done && t.due_date && t.due_date < today;
              return (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3"
                >
                  <span
                    className={cn(
                      "min-w-0 flex-1 text-sm font-medium",
                      done ? "text-neutral-400 line-through" : "text-neutral-900",
                    )}
                  >
                    {t.title}
                  </span>
                  {t.due_date ? (
                    <span
                      className={cn(
                        "text-xs",
                        overdue ? "font-medium text-red-600" : "text-neutral-500",
                      )}
                    >
                      {formatDate(t.due_date)}
                    </span>
                  ) : null}
                  <StatusBadge label={t.status?.label} color={t.status?.color} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
      <Link
        href="/tasks"
        className="inline-block text-sm font-medium text-brand-600 hover:underline"
      >
        Alle Aufgaben oeffnen →
      </Link>
    </div>
  );
}

/* ================================================================ Dateien */

export function FilesTab() {
  return (
    <EmptyState
      icon={Paperclip}
      title="Datei-Upload folgt"
      description="Dateien je Prospect kommen mit der Storage-Integration. Bis dahin: Links in den Notizen ablegen."
    />
  );
}
