"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  Mail,
  MessageCircle,
  CalendarPlus,
  StickyNote,
  FileText,
  FileSignature,
  Pencil,
  Trash2,
  Plus,
  Loader2,
  Check,
  Flame,
  ThermometerSun,
  Snowflake,
  Sparkles,
  Trophy,
  Ban,
  Repeat2,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { QuickCreate } from "@/components/tasks/quick-create";
import { LeadForm } from "@/components/sales/lead-form";
import {
  LEAD_STATUSES,
  LEAD_SOURCES,
  SALES_ACTIVITY_TYPES,
  SALES_ACTIVITY_TYPE_LABELS,
  statusLabel,
  type SalesActivityType,
} from "@/config/catalog";
import { computeLeadScore } from "@/lib/lead-score";
import {
  moveLeadAction,
  deleteLeadAction,
  convertLeadAction,
  createSalesActivityAction,
  updateLeadAction,
} from "@/app/(app)/sales/actions";
import type { SalesFormOptions } from "@/app/(app)/sales/actions";
import { formatDate, formatCHF, cn } from "@/lib/utils";
import type {
  LeadWithRelations,
  SalesActivity,
  Meeting,
  Offer,
  TaskWithRelations,
} from "@/types/entities";

/* ------------------------------------------------------------------ helpers */

const SOURCE_LABELS: Record<string, string> = {
  meta_ads: "Meta Ads",
  tiktok_ads: "TikTok Ads",
  google_ads: "Google Ads",
  linkedin_ads: "LinkedIn Ads",
  manual: "Manuell",
  vermittlung: "Vermittlung",
  lohnrechner: "Lohnrechner",
};
const sourceLabel = (s: string | null | undefined): string =>
  s ? SOURCE_LABELS[s] ?? s : "-";

const META_FIELD_LABELS: Record<string, string> = {
  situation: "Situation", zeitaufwand: "Zeitaufwand", pflegemassnahmen: "Pflegemassnahmen",
  nachricht: "Nachricht", message: "Nachricht", city: "Stadt", kanton: "Kanton",
  zip_code: "PLZ", street: "Strasse", birthdate: "Geburtsdatum", received_at: "Eingegangen am",
  form_name: "Formular", ad_name: "Anzeige", campaign_name: "Kampagne", dienstleistung: "Dienstleistung",
  company: "Firma", phone_number: "Telefon", phone: "Telefon", email: "E-Mail",
  work_email: "Geschaeftliche E-Mail", name: "Name", full_name: "Name",
  first_name: "Vorname", last_name: "Nachname", platform: "Plattform",
};
const META_SKIP = new Set(["provider", "id", "org_id", "status", "source"]);
const prettyMetaLabel = (k: string): string =>
  META_FIELD_LABELS[k] ?? k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function collectFormFields(meta: Record<string, unknown> | null | undefined): Array<[string, string]> {
  if (!meta || typeof meta !== "object") return [];
  const out = new Map<string, string>();
  const add = (k: string, v: unknown) => {
    if (v == null || typeof v === "object") return;
    const s = String(v).trim();
    if (!s || s.toLowerCase() === "null" || META_SKIP.has(k)) return;
    if (!out.has(k)) out.set(k, s);
  };
  const walk = (obj: unknown) => {
    if (!obj || typeof obj !== "object") return;
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (v && typeof v === "object") walk(v);
      else add(k, v);
    }
  };
  walk(meta);
  return [...out.entries()].map(([k, v]) => [prettyMetaLabel(k), v]);
}

type Level = "Hot" | "Warm" | "Cold";
function scoreInfo(lead: LeadWithRelations): {
  score: number;
  level: Level;
  reasons: { sign: "+" | "-"; text: string }[];
} {
  const status = lead.status?.key ?? "neu";
  const score = computeLeadScore({
    status,
    estimated_value: lead.estimated_value,
    company_size: lead.company_size,
    next_action_date: lead.next_action_date,
  });
  const level: Level = score >= 70 ? "Hot" : score >= 40 ? "Warm" : "Cold";
  const r: { sign: "+" | "-"; text: string }[] = [];
  r.push({ sign: score >= 40 ? "+" : "-", text: `Status: ${lead.status?.label ?? status}` });
  if (lead.phone) r.push({ sign: "+", text: "Telefonnummer vorhanden" });
  else r.push({ sign: "-", text: "Keine Telefonnummer" });
  if (lead.email) r.push({ sign: "+", text: "E-Mail vorhanden" });
  if (lead.website) r.push({ sign: "+", text: "Website vorhanden" });
  if (lead.estimated_value) r.push({ sign: "+", text: "Budget hinterlegt" });
  if (lead.next_action_date) r.push({ sign: "+", text: "Aktives Follow-up" });
  else r.push({ sign: "-", text: "Kein Follow-up geplant" });
  if (status === "nicht_erreicht") r.push({ sign: "-", text: "Nicht erreicht" });
  if (status === "mehrfach_nicht_erreicht") r.push({ sign: "-", text: "Mehrfach nicht erreicht" });
  return { score, level, reasons: r };
}

const today = () => new Date().toISOString().slice(0, 10);
const daysBetween = (iso: string) =>
  Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
const phoneDigits = (p: string) => p.replace(/[^0-9]/g, "");

const TABS = [
  { key: "overview", label: "Uebersicht" },
  { key: "activity", label: "Aktivitaet" },
  { key: "tasks", label: "Aufgaben" },
  { key: "offers", label: "Angebote" },
  { key: "notes", label: "Notizen" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

/* -------------------------------------------------------------------- shell */

export function LeadDetail({
  lead,
  activities,
  meetings,
  tasks,
  offers,
  options,
}: {
  lead: LeadWithRelations;
  activities: SalesActivity[];
  meetings: Meeting[];
  tasks: TaskWithRelations[];
  offers: Offer[];
  options: SalesFormOptions;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("overview");
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const name = lead.contact_name || lead.company_name;
  const sc = useMemo(() => scoreInfo(lead), [lead]);

  const openTasks = tasks.filter((t) => !["done", "archived"].includes(t.status?.key ?? ""));
  const lastActivity = activities[0]?.activity_date ?? lead.created_at;

  function changeStatus(statusKey: string) {
    start(async () => {
      await moveLeadAction(lead.id, statusKey);
      router.refresh();
    });
  }
  function convert() {
    if (!window.confirm("Diesen Lead zu einem Kunden konvertieren? Es wird ein Kunden-Datensatz angelegt.")) return;
    start(async () => {
      const r = await convertLeadAction(lead.id);
      if (r.ok) router.push("/clients");
    });
  }
  function remove() {
    if (!window.confirm("Lead wirklich loeschen?")) return;
    start(async () => {
      const r = await deleteLeadAction(lead.id);
      if (r.ok) router.push("/sales/leads");
    });
  }
  function openTask(title: string) {
    setTaskTitle(title);
    setTaskOpen(true);
  }
  function focusNote() {
    setTab("overview");
    setTimeout(() => noteRef.current?.focus(), 60);
  }

  // Tastatur-Shortcuts (N/F/C/M/A/T) wenn nicht in einem Eingabefeld.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
      if (typing || editing || taskOpen) return;
      const k = e.key.toLowerCase();
      if (k === "n") { e.preventDefault(); focusNote(); }
      else if (k === "f") { e.preventDefault(); openTask(`Follow-up: ${name}`); }
      else if (k === "t") { e.preventDefault(); openTask(`Termin mit ${name}`); }
      else if (k === "c" && lead.phone) { e.preventDefault(); window.location.href = `tel:${lead.phone}`; }
      else if (k === "m" && lead.email) { e.preventDefault(); window.location.href = `mailto:${lead.email}`; }
      else if (k === "a") { e.preventDefault(); router.push("/sales/proposals"); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [editing, taskOpen, name, lead.phone, lead.email, router]);

  return (
    <div className="space-y-4">
      <Link href="/sales/leads" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800">
        <ArrowLeft className="h-4 w-4" /> Zurueck zu Leads
      </Link>

      {/* HEADER */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{name}</h1>
              <StatusBadge label={lead.status?.label} color={lead.status?.color} />
              <LevelChip level={sc.level} score={sc.score} />
            </div>
            <p className="mt-1 text-sm text-neutral-500">
              {lead.company_name}
              {lead.dienstleistung ? ` · ${lead.dienstleistung}` : ""}
            </p>
            <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
              <HeaderFact label="Quelle" value={sourceLabel(lead.source)} />
              <HeaderFact label="Verantwortlich" value={lead.owner?.full_name ?? "Nicht zugewiesen"} />
              <HeaderFact label="Naechste Aktion" value={lead.next_action_date ? formatDate(lead.next_action_date) : "—"} />
              <HeaderFact label="Erstellt" value={lead.created_at ? formatDate(lead.created_at) : "—"} />
            </dl>
          </div>

          {/* Status + Mehr */}
          <div className="flex shrink-0 items-center gap-2">
            <select
              value={lead.status?.key ?? "neu"}
              onChange={(e) => changeStatus(e.target.value)}
              disabled={pending}
              aria-label="Status aendern"
              className="h-9 rounded-lg border border-neutral-300 bg-white px-2.5 text-sm font-medium text-neutral-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              {LEAD_STATUSES.map((s) => (<option key={s.key} value={s.key}>{s.label}</option>))}
            </select>
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" /> Bearbeiten
            </Button>
            <button type="button" onClick={remove} disabled={pending} aria-label="Lead loeschen" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Aktions-Leiste */}
        <div className="mt-4 flex flex-wrap gap-2 border-t border-neutral-100 pt-4">
          <ActionBtn icon={Phone} label="Anrufen" href={lead.phone ? `tel:${lead.phone}` : undefined} kbd="C" />
          <ActionBtn icon={Mail} label="Mail" href={lead.email ? `mailto:${lead.email}` : undefined} kbd="M" />
          <ActionBtn icon={MessageCircle} label="WhatsApp" href={lead.phone ? `https://wa.me/${phoneDigits(lead.phone)}` : undefined} external />
          <ActionBtn icon={CalendarPlus} label="Termin" onClick={() => openTask(`Termin mit ${name}`)} kbd="T" />
          <ActionBtn icon={StickyNote} label="Notiz" onClick={focusNote} kbd="N" />
          <ActionBtn icon={Repeat2} label="Follow-up" onClick={() => openTask(`Follow-up: ${name}`)} kbd="F" />
          <ActionBtn icon={FileText} label="Angebot" onClick={() => router.push("/sales/proposals")} kbd="A" />
          <ActionBtn icon={FileSignature} label="Vertrag" onClick={() => router.push("/sales/contracts")} />
        </div>
      </div>

      {/* KPI BAR */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Score" value={sc.score} />
        <Kpi label="Kontakte" value={activities.length} />
        <Kpi label="Offene Aufgaben" value={openTasks.length} />
        <Kpi label="Angebote" value={offers.length} />
        <Kpi label="Termine" value={meetings.length} />
        <Kpi label="Letzte Aktivitaet" value={lastActivity ? formatDate(lastActivity) : "—"} small />
      </div>

      {/* 70 / 30 */}
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        {/* LINKS */}
        <div className="min-w-0 space-y-4">
          <nav className="flex gap-1 overflow-x-auto rounded-xl border border-neutral-200 bg-white p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  tab === t.key ? "bg-brand-600 text-white" : "text-neutral-600 hover:bg-neutral-100",
                )}
              >
                {t.label}
                {t.key === "activity" && activities.length ? ` ${activities.length}` : ""}
                {t.key === "tasks" && tasks.length ? ` ${tasks.length}` : ""}
                {t.key === "offers" && offers.length ? ` ${offers.length}` : ""}
              </button>
            ))}
          </nav>

          {tab === "overview" ? (
            <OverviewTab lead={lead} options={options} activities={activities} meetings={meetings} offers={offers} tasks={tasks} noteRef={noteRef} />
          ) : tab === "activity" ? (
            <ActivityTab leadId={lead.id} activities={activities} />
          ) : tab === "tasks" ? (
            <TasksTab tasks={tasks} onNew={() => openTask(`Follow-up: ${name}`)} />
          ) : tab === "offers" ? (
            <OffersTab offers={offers} />
          ) : (
            <NotesTab lead={lead} />
          )}
        </div>

        {/* RECHTS - Sticky Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <ScoreCard sc={sc} />
          <QuickActions
            lead={lead}
            onFollowup={() => openTask(`Follow-up: ${name}`)}
            onTermin={() => openTask(`Termin mit ${name}`)}
            onWin={convert}
            onLose={() => changeStatus("absage")}
            onAngebot={() => router.push("/sales/proposals")}
            pending={pending}
          />
          <FollowupsCard tasks={openTasks} onNew={() => openTask(`Follow-up: ${name}`)} />
          <AiInsights lead={lead} sc={sc} activities={activities} offers={offers} openTasks={openTasks} />
        </aside>
      </div>

      {/* Bearbeiten-Modal */}
      <Modal open={editing} onClose={() => setEditing(false)} title="Lead bearbeiten" size="lg">
        <LeadForm
          mode="edit"
          leadId={lead.id}
          users={options.users}
          initial={{
            company_name: lead.company_name, contact_name: lead.contact_name, email: lead.email,
            phone: lead.phone, website: lead.website, industry: lead.industry, company_size: lead.company_size,
            city: lead.city, country: lead.country, source: lead.source, estimated_value: lead.estimated_value,
            status: lead.status?.key, owner_id: lead.owner_id, next_action_date: lead.next_action_date, notes: lead.notes,
          }}
          onCancel={() => setEditing(false)}
          onDone={() => { setEditing(false); router.refresh(); }}
        />
      </Modal>

      {/* Aufgabe/Follow-up/Termin */}
      <QuickCreate
        hideTrigger
        open={taskOpen}
        onOpenChange={(o) => setTaskOpen(o)}
        initial={{ lead_id: lead.id, title: taskTitle, due_date: today() }}
      />
    </div>
  );
}

/* --------------------------------------------------------------- bits */

function HeaderFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-neutral-400">{label}</dt>
      <dd className="font-medium text-neutral-800">{value}</dd>
    </div>
  );
}

function LevelChip({ level, score }: { level: Level; score: number }) {
  const Icon = level === "Hot" ? Flame : level === "Warm" ? ThermometerSun : Snowflake;
  const cls =
    level === "Hot" ? "bg-emerald-50 text-emerald-700"
    : level === "Warm" ? "bg-amber-50 text-amber-700"
    : "bg-slate-100 text-slate-600";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", cls)}>
      <Icon className="h-3.5 w-3.5" /> {level} · {score}
    </span>
  );
}

function ActionBtn({
  icon: Icon, label, href, onClick, external, kbd,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; href?: string; onClick?: () => void; external?: boolean; kbd?: string;
}) {
  const cls = "group inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-700 disabled:opacity-40";
  const inner = (
    <>
      <Icon className="h-4 w-4" />
      {label}
      {kbd ? <kbd className="ml-0.5 hidden rounded border border-neutral-200 bg-neutral-50 px-1 text-[10px] text-neutral-400 group-hover:inline">{kbd}</kbd> : null}
    </>
  );
  if (href) {
    return (
      <a href={href} {...(external ? { target: "_blank", rel: "noreferrer" } : {})} className={cls}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={!onClick} className={cls}>
      {inner}
    </button>
  );
}

function Kpi({ label, value, small }: { label: string; value: string | number; small?: boolean }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
      <p className={cn("font-semibold text-neutral-900", small ? "text-sm" : "text-xl")}>{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}

/* --------------------------------------------------------------- Score card */

function ScoreCard({ sc }: { sc: ReturnType<typeof scoreInfo> }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const off = c - (sc.score / 100) * c;
  const stroke = sc.level === "Hot" ? "#10b981" : sc.level === "Warm" ? "#f59e0b" : "#64748b";
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-neutral-900">Lead Score</h3>
      <div className="flex items-center gap-4">
        <div className="relative h-[88px] w-[88px] shrink-0">
          <svg viewBox="0 0 88 88" className="h-full w-full -rotate-90">
            <circle cx="44" cy="44" r={r} fill="none" stroke="#f1f5f9" strokeWidth="8" />
            <circle cx="44" cy="44" r={r} fill="none" stroke={stroke} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} style={{ transition: "stroke-dashoffset .6s ease" }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-neutral-900">{sc.score}</span>
            <span className="text-[10px] uppercase tracking-wide text-neutral-400">{sc.level}</span>
          </div>
        </div>
        <ul className="min-w-0 flex-1 space-y-1 text-xs">
          {sc.reasons.slice(0, 6).map((re, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <span className={cn("inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold", re.sign === "+" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500")}>
                {re.sign}
              </span>
              <span className="truncate text-neutral-600">{re.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Quick actions */

function QuickActions({
  lead, onFollowup, onTermin, onWin, onLose, onAngebot, pending,
}: {
  lead: LeadWithRelations;
  onFollowup: () => void; onTermin: () => void; onWin: () => void; onLose: () => void; onAngebot: () => void;
  pending: boolean;
}) {
  const Row = ({ icon: Icon, label, href, onClick, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; href?: string; onClick?: () => void; tone?: "win" | "lose" }) => {
    const cls = cn(
      "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      tone === "win" ? "text-emerald-700 hover:bg-emerald-50"
      : tone === "lose" ? "text-red-600 hover:bg-red-50"
      : "text-neutral-700 hover:bg-neutral-100",
    );
    const inner = (<><Icon className="h-4 w-4 shrink-0" /> {label}</>);
    return href ? <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className={cls}>{inner}</a>
      : <button type="button" onClick={onClick} disabled={pending} className={cls}>{inner}</button>;
  };
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-2 shadow-sm">
      <h3 className="px-2 py-1.5 text-sm font-semibold text-neutral-900">Quick Actions</h3>
      <div className="space-y-0.5">
        {lead.phone ? <Row icon={Phone} label="Lead anrufen" href={`tel:${lead.phone}`} /> : null}
        {lead.phone ? <Row icon={MessageCircle} label="WhatsApp oeffnen" href={`https://wa.me/${phoneDigits(lead.phone)}`} /> : null}
        {lead.email ? <Row icon={Mail} label="E-Mail schreiben" href={`mailto:${lead.email}`} /> : null}
        <Row icon={CalendarPlus} label="Termin buchen" onClick={onTermin} />
        <Row icon={Repeat2} label="Follow-up erstellen" onClick={onFollowup} />
        <Row icon={FileText} label="Angebot erstellen" onClick={onAngebot} />
        <div className="my-1 border-t border-neutral-100" />
        <Row icon={Trophy} label="Lead gewinnen" onClick={onWin} tone="win" />
        <Row icon={Ban} label="Lead verlieren" onClick={onLose} tone="lose" />
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Follow-ups */

function FollowupsCard({ tasks, onNew }: { tasks: TaskWithRelations[]; onNew: () => void }) {
  const t = today();
  const overdue = tasks.filter((x) => x.due_date && x.due_date < t);
  const todayT = tasks.filter((x) => x.due_date === t);
  const upcoming = tasks.filter((x) => x.due_date && x.due_date > t);
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">Follow-ups</h3>
        <button type="button" onClick={onNew} className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
          <Plus className="h-3.5 w-3.5" /> Neu
        </button>
      </div>
      {tasks.length === 0 ? (
        <p className="py-3 text-center text-xs text-neutral-400">Keine offenen Follow-ups.</p>
      ) : (
        <div className="space-y-2 text-sm">
          {overdue.length ? <FuGroup label="Ueberfaellig" tone="red" items={overdue} /> : null}
          {todayT.length ? <FuGroup label="Heute" tone="brand" items={todayT} /> : null}
          {upcoming.length ? <FuGroup label="Demnaechst" tone="neutral" items={upcoming} /> : null}
        </div>
      )}
    </div>
  );
}
function FuGroup({ label, tone, items }: { label: string; tone: "red" | "brand" | "neutral"; items: TaskWithRelations[] }) {
  const dot = tone === "red" ? "bg-red-500" : tone === "brand" ? "bg-brand-500" : "bg-neutral-300";
  return (
    <div>
      <p className="mb-1 text-[11px] uppercase tracking-wide text-neutral-400">{label}</p>
      <ul className="space-y-1">
        {items.map((x) => (
          <li key={x.id}>
            <Link href={`/tasks/${x.id}`} className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-neutral-50">
              <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot)} />
              <span className="flex-1 truncate text-neutral-700">{x.title}</span>
              {x.due_date ? <span className="shrink-0 text-xs text-neutral-400">{formatDate(x.due_date)}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* --------------------------------------------------------------- AI insights */

function AiInsights({
  lead, sc, activities, offers, openTasks,
}: {
  lead: LeadWithRelations; sc: ReturnType<typeof scoreInfo>;
  activities: SalesActivity[]; offers: Offer[]; openTasks: TaskWithRelations[];
}) {
  const insights: string[] = [];
  const status = lead.status?.key ?? "neu";
  const lastContact = activities[0]?.activity_date ?? lead.created_at;
  const days = lastContact ? daysBetween(lastContact) : null;

  if (sc.score >= 70) insights.push("Hohes Abschlusspotenzial - jetzt aktiv dranbleiben.");
  if (days != null && days >= 7 && !["abgeschlossen", "absage", "fehleintrag"].includes(status))
    insights.push(`Seit ${days} Tagen kein erfasster Kontakt - Termin vereinbaren.`);
  if (lead.next_action_date && lead.next_action_date < today())
    insights.push("Follow-up ueberfaellig - heute nachfassen.");
  if (status === "termin_gebucht" && offers.length === 0)
    insights.push("Naechster Schritt: Angebot erstellen.");
  if (["nicht_erreicht", "mehrfach_nicht_erreicht"].includes(status))
    insights.push("Nicht erreicht - alternativen Kanal (WhatsApp/Mail) versuchen.");
  if (!lead.owner_id) insights.push("Noch niemandem zugewiesen - Verantwortlichen festlegen.");
  if (openTasks.length === 0 && !["abgeschlossen", "absage", "fehleintrag"].includes(status))
    insights.push("Keine offene Aufgabe - naechsten Schritt planen.");
  if (insights.length === 0) insights.push("Alles im gruenen Bereich - dranbleiben.");

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-4 shadow-sm">
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-brand-800">
        <Sparkles className="h-4 w-4" /> AI Insights
      </h3>
      <ul className="space-y-2 text-sm text-neutral-700">
        {insights.slice(0, 4).map((t, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-neutral-400">Regelbasiert aus den vorhandenen Lead-Daten - keine externen Annahmen.</p>
    </div>
  );
}

/* --------------------------------------------------------------- Overview tab */

function OverviewTab({
  lead, options, activities, meetings, offers, tasks, noteRef,
}: {
  lead: LeadWithRelations; options: SalesFormOptions;
  activities: SalesActivity[]; meetings: Meeting[]; offers: Offer[]; tasks: TaskWithRelations[];
  noteRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const formFields = collectFormFields(lead.metadata_json);
  const statusOptions = LEAD_STATUSES.map((s) => ({ value: s.key, label: s.label }));
  const sourceOptions = LEAD_SOURCES.map((s) => ({ value: s.key, label: s.label }));
  const ownerOptions = [{ value: "", label: "Nicht zugewiesen" }, ...options.users.map((u) => ({ value: u.id, label: u.full_name ?? "Unbenannt" }))];

  return (
    <div className="space-y-4">
      {/* Inline editierbare Lead-Informationen */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <h3 className="mb-3 text-sm font-semibold text-neutral-900">Lead-Informationen</h3>
          <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            <EditableField lead={lead} field="company_name" label="Firma" value={lead.company_name} />
            <EditableField lead={lead} field="contact_name" label="Ansprechpartner" value={lead.contact_name} />
            <EditableField lead={lead} field="email" label="E-Mail" value={lead.email} type="email" />
            <EditableField lead={lead} field="phone" label="Telefon" value={lead.phone} />
            <EditableField lead={lead} field="website" label="Website" value={lead.website} />
            <EditableField lead={lead} field="industry" label="Branche" value={lead.industry} />
            <EditableField lead={lead} field="city" label="Standort" value={lead.city} />
            <EditableField lead={lead} field="source" label="Quelle" value={lead.source} kind="select" selectOptions={sourceOptions} display={sourceLabel(lead.source)} />
            <EditableField lead={lead} field="status" label="Status" value={lead.status?.key} kind="status" selectOptions={statusOptions} display={lead.status?.label} />
            <EditableField lead={lead} field="owner_id" label="Verantwortlich" value={lead.owner_id} kind="select" selectOptions={ownerOptions} display={lead.owner?.full_name ?? "Nicht zugewiesen"} />
            <EditableField lead={lead} field="estimated_value" label="Budget" value={lead.estimated_value} kind="money" display={formatCHF(lead.estimated_value, lead.currency)} />
          </dl>
        </CardContent>
      </Card>

      {/* Herkunft + Formulardaten (read-only) */}
      {formFields.length > 0 ? (
        <Card>
          <CardContent className="p-4 sm:p-5">
            <h3 className="mb-3 text-sm font-semibold text-neutral-900">Formulardaten &amp; alle erfassten Angaben</h3>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              {formFields.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs uppercase tracking-wide text-neutral-400">{label}</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap break-words font-medium text-neutral-800">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      ) : null}

      {/* Timeline mit Notiz-Composer */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <h3 className="mb-3 text-sm font-semibold text-neutral-900">Verlauf</h3>
          <NoteComposer leadId={lead.id} noteRef={noteRef} />
          <Timeline lead={lead} activities={activities} meetings={meetings} offers={offers} tasks={tasks} />
        </CardContent>
      </Card>
    </div>
  );
}

/* --------------------------------------------------------------- Editable field */

function EditableField({
  lead, field, label, value, type = "text", kind = "text", selectOptions, display,
}: {
  lead: LeadWithRelations; field: string; label: string; value: unknown;
  type?: string; kind?: "text" | "select" | "status" | "money";
  selectOptions?: { value: string; label: string }[]; display?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const initialStr = kind === "money" ? (value != null ? String(Math.round(Number(value) / 100)) : "") : value == null ? "" : String(value);
  const [val, setVal] = useState(initialStr);

  const shown = display ?? (value == null || value === "" ? "—" : String(value));

  function save(next: string) {
    if (next === initialStr) { setEditing(false); return; }
    start(async () => {
      if (kind === "status") {
        await moveLeadAction(lead.id, next);
      } else {
        const payload: Record<string, unknown> =
          kind === "money"
            ? { estimated_value: next === "" ? null : Math.round(Number(next) * 100) }
            : { [field]: next === "" ? null : next };
        await updateLeadAction(lead.id, payload);
      }
      setEditing(false);
      router.refresh();
    });
  }

  const cls = "h-8 w-full rounded-md border border-brand-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100";

  return (
    <div className="group flex items-center justify-between gap-3 border-b border-neutral-100 py-2 last:border-0">
      <dt className="shrink-0 text-xs uppercase tracking-wide text-neutral-400">{label}</dt>
      <dd className="min-w-0 flex-1 text-right">
        {editing ? (
          <div className="flex items-center justify-end gap-1">
            {kind === "select" || kind === "status" ? (
              <select autoFocus value={val} onChange={(e) => setVal(e.target.value)} onBlur={() => save(val)} className={cls + " max-w-[12rem]"}>
                {selectOptions?.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
              </select>
            ) : (
              <input
                autoFocus type={kind === "money" ? "number" : type} value={val}
                onChange={(e) => setVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") save(val); if (e.key === "Escape") setEditing(false); }}
                onBlur={() => save(val)}
                className={cls + " max-w-[14rem] text-right"}
              />
            )}
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-400" /> : null}
          </div>
        ) : (
          <button type="button" onClick={() => { setVal(initialStr); setEditing(true); }} className="inline-flex max-w-full items-center gap-1.5 rounded px-1 text-sm font-medium text-neutral-800 hover:bg-neutral-100">
            <span className="truncate">{shown}</span>
            <Pencil className="h-3 w-3 shrink-0 text-transparent group-hover:text-neutral-300" />
          </button>
        )}
      </dd>
    </div>
  );
}

/* --------------------------------------------------------------- Note composer + timeline */

function NoteComposer({ leadId, noteRef }: { leadId: string; noteRef: React.RefObject<HTMLTextAreaElement | null> }) {
  const router = useRouter();
  const [type, setType] = useState<SalesActivityType>(SALES_ACTIVITY_TYPES[0].key);
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  function submit() {
    if (!body.trim()) { noteRef.current?.focus(); return; }
    start(async () => {
      const r = await createSalesActivityAction({ lead_id: leadId, type, body: body.trim() });
      if (r.ok) { setBody(""); router.refresh(); }
    });
  }
  return (
    <div className="mb-4 rounded-xl border border-neutral-200 bg-neutral-50/60 p-3">
      <textarea
        ref={noteRef} value={body} onChange={(e) => setBody(e.target.value)} rows={2}
        placeholder="Notiz, Call-Ergebnis, E-Mail festhalten … (N)"
        className="block w-full resize-none rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
      />
      <div className="mt-2 flex items-center justify-between">
        <select value={type} onChange={(e) => setType(e.target.value as SalesActivityType)} className="h-8 rounded-md border border-neutral-300 bg-white px-2 text-sm text-neutral-700">
          {SALES_ACTIVITY_TYPES.map((t) => (<option key={t.key} value={t.key}>{t.label}</option>))}
        </select>
        <Button size="sm" onClick={submit} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Festhalten
        </Button>
      </div>
    </div>
  );
}

function Timeline({
  lead, activities, meetings, offers, tasks,
}: {
  lead: LeadWithRelations; activities: SalesActivity[]; meetings: Meeting[]; offers: Offer[]; tasks: TaskWithRelations[];
}) {
  const items = useMemo(() => {
    type T = { id: string; date: string; kind: string; title: string; desc?: string | null; user?: string | null };
    const list: T[] = [];
    if (lead.created_at) list.push({ id: "created", date: lead.created_at, kind: "created", title: "Lead erstellt", desc: lead.legacy_status ? `aus altem CRM · Status ${lead.legacy_status}` : sourceLabel(lead.source) });
    for (const a of activities) list.push({ id: `a-${a.id}`, date: a.activity_date, kind: a.type, title: a.subject || SALES_ACTIVITY_TYPE_LABELS[a.type as SalesActivityType] || String(a.type), desc: a.body, user: a.author?.full_name });
    for (const m of meetings) list.push({ id: `m-${m.id}`, date: m.meeting_date || m.created_at, kind: "meeting", title: m.title || "Termin", desc: statusLabel("meeting", m.status) });
    for (const o of offers) list.push({ id: `o-${o.id}`, date: o.created_at, kind: "offer", title: o.title || "Angebot", desc: `${formatCHF(o.amount, o.currency)} · ${statusLabel("offer", o.status)}` });
    for (const t of tasks) list.push({ id: `t-${t.id}`, date: t.created_at, kind: "task", title: t.title, desc: t.status?.label });
    return list.filter((i) => i.date).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [lead, activities, meetings, offers, tasks]);

  if (items.length === 0) return <EmptyState title="Kein Verlauf" description="Erfasse Calls, E-Mails oder Notizen, um den Verlauf aufzubauen." />;

  return (
    <ol className="relative space-y-4 border-l border-neutral-200 pl-5">
      {items.map((i) => (
        <li key={i.id} className="relative">
          <span aria-hidden className={cn("absolute -left-[1.4rem] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white", kindDot(i.kind))} />
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-sm font-medium text-neutral-900">{i.title}</span>
            <span className="text-xs text-neutral-400">{formatDate(i.date)}</span>
            {i.user ? <span className="text-xs text-neutral-400">· {i.user}</span> : null}
            <Badge tone="neutral">{kindLabel(i.kind)}</Badge>
          </div>
          {i.desc ? <p className="mt-0.5 whitespace-pre-wrap text-sm text-neutral-600">{i.desc}</p> : null}
        </li>
      ))}
    </ol>
  );
}
const kindDot = (k: string) =>
  k === "created" ? "bg-brand-500" : k === "offer" ? "bg-emerald-500" : k === "meeting" ? "bg-blue-500" : k === "task" ? "bg-amber-500" : k === "call" ? "bg-violet-500" : "bg-neutral-400";
const kindLabel = (k: string) =>
  k === "created" ? "Erstellt" : k === "offer" ? "Angebot" : k === "meeting" ? "Termin" : k === "task" ? "Aufgabe" : (SALES_ACTIVITY_TYPE_LABELS[k as SalesActivityType] ?? k);

/* --------------------------------------------------------------- secondary tabs */

function ActivityTab({ leadId, activities }: { leadId: string; activities: SalesActivity[] }) {
  const router = useRouter();
  const [type, setType] = useState<SalesActivityType>(SALES_ACTIVITY_TYPES[0].key);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  function submit() {
    start(async () => {
      const r = await createSalesActivityAction({ lead_id: leadId, type, subject: subject.trim() || undefined, body: body.trim() || undefined });
      if (r.ok) { setSubject(""); setBody(""); router.refresh(); }
    });
  }
  return (
    <Card>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-2 rounded-xl border border-neutral-200 bg-neutral-50/60 p-3">
          <div className="grid gap-2 sm:grid-cols-[150px_1fr]">
            <select value={type} onChange={(e) => setType(e.target.value as SalesActivityType)} className="h-9 rounded-lg border border-neutral-300 bg-white px-2 text-sm">
              {SALES_ACTIVITY_TYPES.map((t) => (<option key={t.key} value={t.key}>{t.label}</option>))}
            </select>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Betreff" className="h-9 rounded-lg border border-neutral-300 bg-white px-3 text-sm" />
          </div>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="Details …" className="block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm" />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={pending}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Erfassen</Button>
          </div>
        </form>
        {activities.length === 0 ? (
          <EmptyState title="Noch keine Aktivitaeten" description="Erfasse Calls, E-Mails oder Notizen." />
        ) : (
          <ol className="relative space-y-3 border-l border-neutral-200 pl-5">
            {activities.map((a) => (
              <li key={a.id} className="relative">
                <span aria-hidden className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-500" />
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-sm font-medium text-neutral-900">{a.subject || SALES_ACTIVITY_TYPE_LABELS[a.type as SalesActivityType] || String(a.type)}</span>
                  <span className="text-xs text-neutral-400">{formatDate(a.activity_date)}</span>
                  {a.author?.full_name ? <span className="text-xs text-neutral-400">· {a.author.full_name}</span> : null}
                </div>
                {a.body ? <p className="mt-0.5 whitespace-pre-wrap text-sm text-neutral-600">{a.body}</p> : null}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function TasksTab({ tasks, onNew }: { tasks: TaskWithRelations[]; onNew: () => void }) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-900">Aufgaben</h3>
          <Button size="sm" variant="secondary" onClick={onNew}><Plus className="h-4 w-4" /> Neue Aufgabe</Button>
        </div>
        {tasks.length === 0 ? (
          <EmptyState title="Keine Aufgaben" description="Lege Follow-ups und To-dos zu diesem Lead an." />
        ) : (
          <ul className="divide-y divide-neutral-100">
            {tasks.map((t) => (
              <li key={t.id}>
                <Link href={`/tasks/${t.id}`} className="flex items-center justify-between gap-3 px-1 py-2.5 hover:bg-neutral-50">
                  <span className="min-w-0 truncate text-sm font-medium text-neutral-800">{t.title}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    {t.due_date ? <span className="text-xs text-neutral-400">{formatDate(t.due_date)}</span> : null}
                    <StatusBadge label={t.status?.label} color={t.status?.color} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function OffersTab({ offers }: { offers: Offer[] }) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-900">Angebote</h3>
          <Link href="/sales/proposals" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"><Plus className="h-4 w-4" /> Neues Angebot</Link>
        </div>
        {offers.length === 0 ? (
          <EmptyState title="Keine Angebote" description="Erstelle ein Angebot ueber die Proposal Engine." />
        ) : (
          <ul className="divide-y divide-neutral-100">
            {offers.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 px-1 py-2.5">
                <span className="min-w-0 truncate text-sm font-medium text-neutral-800">{o.title}</span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="text-sm tabular-nums text-neutral-600">{formatCHF(o.amount, o.currency)}</span>
                  <StatusBadge label={statusLabel("offer", o.status)} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function NotesTab({ lead }: { lead: LeadWithRelations }) {
  const router = useRouter();
  const [val, setVal] = useState(lead.notes ?? "");
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  function save() {
    if (val === (lead.notes ?? "")) return;
    start(async () => {
      await updateLeadAction(lead.id, { notes: val === "" ? null : val });
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 1500);
    });
  }
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-900">Notizen</h3>
          {saved ? <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><Check className="h-3.5 w-3.5" /> Gespeichert</span> : null}
        </div>
        <textarea
          value={val} onChange={(e) => setVal(e.target.value)} onBlur={save} rows={10}
          placeholder="Freie Notizen zu diesem Lead … (wird beim Verlassen des Feldes gespeichert)"
          className="block w-full resize-y rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm leading-relaxed focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        <div className="mt-2 flex justify-end">
          <Button size="sm" onClick={save} disabled={pending}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Speichern</Button>
        </div>
      </CardContent>
    </Card>
  );
}
