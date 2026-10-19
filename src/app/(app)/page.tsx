import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Calendar,
  Camera,
  CircleCheck,
  Clapperboard,
  FileSignature,
  Flag,
  ListChecks,
  PhoneCall,
  Presentation,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { clientsOpsService, financeService, productionDashboardService, salesDashboardService } from "@/server/services";
import { homeService, type AgendaItem, type AgendaKind } from "@/server/services/home.service";
import { QuickCreate } from "@/components/tasks/quick-create";
import { LeadQuickCreate } from "@/components/sales/lead-quick-create";
import { ClientQuickCreate } from "@/components/clients/client-quick-create";
import { today } from "@/lib/dates";
import { cn, formatCHF, initials } from "@/lib/utils";
import { LEAD_SOURCE_LABELS } from "@/config/catalog";

/**
 * Home: was heute zu tun ist (eine Liste, priorisiert), wie das Geschaeft
 * laeuft (Puls) und wo die Leads stehen (Lead-Fluss). Bewusst wenige,
 * klare Bloecke statt vieler gleich lauter Karten.
 */

const SALES = ["super_admin", "ceo", "cso", "sales"] as const;
const FINANCE = ["super_admin", "ceo", "finance"] as const;
const LEADERSHIP = ["super_admin", "ceo", "cso"] as const;

const WEEKDAY = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const WEEKDAY_LONG = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const MONTH = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

const KIND: Record<AgendaKind, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  task: { label: "Aufgabe", icon: ListChecks },
  followup: { label: "Follow-up", icon: PhoneCall },
  meeting: { label: "Termin", icon: Calendar },
  shoot: { label: "Shooting", icon: Camera },
  deadline: { label: "Deadline", icon: Flag },
  reporting: { label: "Reporting", icon: Presentation },
  contract: { label: "Vertrag", icon: FileSignature },
  launch: { label: "Go-live", icon: Clapperboard },
};

// Lead-Fluss: eine Farbe, heller -> dunkler entlang der Pipeline (Abschluss eigene Farbe)
const FLOW_TONES = ["bg-brand-100", "bg-brand-200", "bg-brand-200", "bg-brand-300", "bg-brand-400", "bg-brand-500", "bg-brand-700"];
const FLOW_TEXT = ["text-brand-900", "text-brand-900", "text-brand-900", "text-brand-900", "text-white", "text-white", "text-white"];

function greeting(d: Date): string {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: "Europe/Zurich" }).formatToParts(d).find((p) => p.type === "hour")?.value ?? 12);
  if (h < 11) return "Guten Morgen";
  if (h < 17) return "Guten Tag";
  return "Guten Abend";
}

function zurichDate(d: Date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts(d).map((x) => [x.type, x.value]));
  const date = new Date(`${p.year}-${p.month}-${p.day}T12:00:00Z`);
  return `${WEEKDAY_LONG[date.getUTCDay()]}, ${date.getUTCDate()}. ${MONTH[date.getUTCMonth()]}`;
}

function ago(iso: string): string {
  const h = Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (h < 1) return "gerade eben";
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.round(h / 24);
  return d === 1 ? "gestern" : `vor ${d} Tagen`;
}

function Delta({ cur, prev }: { cur: number; prev: number | null }) {
  if (prev == null) return null;
  const diff = cur - prev;
  if (diff === 0) return <span className="text-xs text-neutral-400">wie Vorwoche</span>;
  return (
    <span className={cn("text-xs tabular-nums", diff > 0 ? "text-emerald-700" : "text-neutral-500")}>
      {diff > 0 ? "+" : "–"}
      {Math.abs(diff)} zur Vorwoche
    </span>
  );
}

function AgendaRow({ item }: { item: AgendaItem }) {
  const k = KIND[item.kind];
  const Icon = k.icon;
  return (
    <li>
      <Link
        href={item.href}
        className="group grid grid-cols-[2rem_1fr_auto] items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-neutral-50 focus-visible:bg-neutral-50"
      >
        <span
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-lg",
            item.overdueDays > 0 ? "bg-rose-50 text-rose-600" : "bg-neutral-100 text-neutral-500 group-hover:bg-brand-50 group-hover:text-brand-600",
          )}
          aria-hidden
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-neutral-900">{item.title}</span>
          <span className="block truncate text-xs text-neutral-500">
            {k.label}
            {item.context ? ` · ${item.context}` : ""}
          </span>
        </span>
        <span className="flex items-center gap-2">
          {item.owner ? (
            <span
              title={item.owner}
              className={cn(
                "hidden h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold sm:inline-flex",
                item.mine ? "bg-brand-600 text-white" : "bg-neutral-200 text-neutral-600",
              )}
            >
              {initials(item.owner)}
            </span>
          ) : null}
          <span className={cn("w-[5.5rem] text-right text-xs tabular-nums", item.overdueDays > 0 ? "font-medium text-rose-600" : "text-neutral-400")}>
            {item.overdueDays > 0
              ? `seit ${item.overdueDays} ${item.overdueDays === 1 ? "Tag" : "Tagen"}`
              : item.date
                ? `${WEEKDAY[new Date(`${item.date}T12:00:00Z`).getUTCDay()]} ${Number(item.date.slice(8, 10))}.${Number(item.date.slice(5, 7))}.`
                : "heute"}
          </span>
        </span>
      </Link>
    </li>
  );
}

function PulseRow({ label, value, sub, href }: { label: string; value: string; sub?: React.ReactNode; href?: string }) {
  const inner = (
    <>
      <span className="text-sm text-neutral-600">{label}</span>
      <span className="text-right">
        <span className="block text-lg font-semibold tabular-nums tracking-tight text-neutral-900">{value}</span>
        {sub ? <span className="block">{sub}</span> : null}
      </span>
    </>
  );
  const cls = "flex items-center justify-between gap-4 py-3";
  return href ? (
    <Link href={href} className={cn(cls, "-mx-2 rounded-lg px-2 transition-colors hover:bg-neutral-50")}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

function Section({ title, aside, children, className }: { title: string; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6", className)}>
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="shrink-0 whitespace-nowrap text-[13px] font-semibold uppercase tracking-[0.08em] text-neutral-500">{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const onlyMine = sp.mine === "1";
  const firstName = user.fullName.split(/\s+/)[0] ?? user.fullName;
  const now = new Date();
  const todayStr = today();

  const showSales = canAccess(user.roles, [...SALES]);
  const showFinance = canAccess(user.roles, [...FINANCE]);
  const showExecutive = canAccess(user.roles, [...LEADERSHIP]);

  const [home, sales, clients, prod, finance] = await Promise.all([
    homeService.load(user.id, todayStr).catch(() => null),
    showSales ? salesDashboardService.summary().catch(() => null) : Promise.resolve(null),
    clientsOpsService.dashboard().catch(() => null),
    productionDashboardService.safeSummary().catch(() => null),
    showFinance ? financeService.summary().catch(() => null) : Promise.resolve(null),
  ]);

  const agenda = (home?.agenda ?? []).filter((a) => !onlyMine || a.mine);
  const overdue = agenda.filter((a) => a.overdueDays > 0);
  const due = agenda.filter((a) => a.overdueDays === 0);
  const shown = [...overdue.slice(0, 8), ...due.slice(0, Math.max(4, 12 - Math.min(overdue.length, 8)))];
  const flow = home?.flow;
  const activeTotal = flow ? flow.active.reduce((s, x) => s + x.count, 0) : 0;
  const bandTotal = activeTotal + (flow?.won.count ?? 0);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Kopf */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-neutral-500">{zurichDate(now)}</p>
          <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight text-neutral-900 sm:text-[32px]">
            {greeting(now)}, {firstName}.
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {overdue.length > 0 ? (
              <>
                <span className="font-medium text-rose-600">{overdue.length} überfällig</span>, {due.length} für heute.
              </>
            ) : due.length > 0 ? (
              <>{due.length} Punkte für heute, nichts überfällig.</>
            ) : (
              <>Heute ist nichts fällig.</>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showSales ? <LeadQuickCreate variant="secondary" label="Lead" /> : null}
          <QuickCreate variant="secondary" label="Aufgabe" />
          <ClientQuickCreate variant="secondary" label="Kunde" />
          {showExecutive ? (
            <Link href="/marketing" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-neutral-900 px-3 text-sm font-medium text-white hover:bg-neutral-800">
              Marketing
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </div>

      {/* Jetzt dran + Puls */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <Section
          title="Jetzt dran"
          aside={
            <div className="flex rounded-lg bg-neutral-100 p-0.5 text-xs font-medium">
              <Link href="/" aria-current={!onlyMine ? "true" : undefined} className={cn("rounded-md px-2.5 py-1", !onlyMine ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500")}>
                Alle
              </Link>
              <Link href="/?mine=1" aria-current={onlyMine ? "true" : undefined} className={cn("rounded-md px-2.5 py-1", onlyMine ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500")}>
                Meine
              </Link>
            </div>
          }
        >
          {shown.length === 0 ? (
            <div>
              <div className="flex items-center gap-3 rounded-xl bg-emerald-50/70 px-4 py-3">
                <CircleCheck className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                <p className="text-sm text-emerald-900">
                  <span className="font-medium">Heute nichts fällig.</span> Keine offenen Aufgaben, Follow-ups oder Termine{onlyMine ? " für dich" : ""}.
                </p>
              </div>
              {home && home.upcoming.length ? (
                <>
                  <p className="mb-1 mt-5 px-2 text-xs font-medium text-neutral-500">Demnächst</p>
                  <ul>
                    {home.upcoming.map((a) => (
                      <AgendaRow key={a.id} item={a} />
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          ) : (
            <>
              {overdue.length > 0 ? (
                <>
                  <p className="mb-1 flex items-center gap-2 px-2 text-xs font-medium text-rose-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" aria-hidden />
                    Überfällig · {overdue.length}
                  </p>
                  <ul className="mb-3">{overdue.slice(0, 8).map((a) => <AgendaRow key={a.id} item={a} />)}</ul>
                </>
              ) : null}
              {due.length > 0 ? (
                <>
                  <p className="mb-1 px-2 text-xs font-medium text-neutral-500">Heute · {due.length}</p>
                  <ul>{shown.filter((a) => a.overdueDays === 0).map((a) => <AgendaRow key={a.id} item={a} />)}</ul>
                </>
              ) : null}
              {agenda.length > shown.length ? (
                <p className="mt-3 px-2 text-xs text-neutral-500">
                  {agenda.length - shown.length} weitere ·{" "}
                  <Link href="/tasks/today" className="font-medium text-brand-700 hover:underline">
                    Aufgaben
                  </Link>{" "}
                  ·{" "}
                  <Link href="/sales/followups" className="font-medium text-brand-700 hover:underline">
                    Follow-ups
                  </Link>
                </p>
              ) : null}
            </>
          )}
        </Section>

        <Section title="Puls">
          <div className="divide-y divide-neutral-100">
            {home ? (
              <PulseRow label="Neue Leads · 7 Tage" value={String(home.newLeads7)} sub={<Delta cur={home.newLeads7} prev={home.newLeadsPrev7} />} href="/sales/leads?sort=created_at&dir=desc" />
            ) : null}
            {home ? <PulseRow label="Noch nicht kontaktiert" value={String(home.uncontacted)} href="/sales/leads?status=neu" /> : null}
            {home ? (
              <PulseRow
                label="Offen ohne nächsten Schritt"
                value={String(home.withoutNext)}
                sub={home.withoutNext > 0 ? <span className="text-xs text-amber-700">Follow-up planen</span> : undefined}
                href="/sales/followups"
              />
            ) : null}
            {home ? <PulseRow label="Termine · nächste 7 Tage" value={String(home.meetingsWeek)} href="/calendar" /> : null}
            {sales && sales.pipelineValue > 0 ? <PulseRow label="Pipeline-Wert" value={formatCHF(sales.pipelineValue)} href="/sales/pipeline" /> : null}
            {finance ? <PulseRow label="Wiederkehrender Umsatz (MRR)" value={formatCHF(finance.mrr)} href="/finance" /> : null}
            {finance && finance.overdueInvoicesCount > 0 ? (
              <PulseRow
                label="Überfällige Rechnungen"
                value={formatCHF(finance.overdueInvoicesAmount)}
                sub={<span className="text-xs text-rose-600">{finance.overdueInvoicesCount} offen</span>}
                href="/finance/open"
              />
            ) : null}
            {clients ? <PulseRow label="Aktive Kunden" value={String(clients.active)} sub={clients.onboarding ? <span className="text-xs text-neutral-500">+ {clients.onboarding} im Onboarding</span> : undefined} href="/clients/list" /> : null}
          </div>
        </Section>
      </div>

      {/* Lead-Fluss */}
      {flow && showSales ? (
        <Section
          title="Lead-Fluss"
          aside={
            <span className="text-xs text-neutral-500">
              {flow.total} Leads · {activeTotal} in Bearbeitung · <span className="font-medium text-emerald-700">{flow.won.count} gewonnen</span>
            </span>
          }
        >
          <div className="flex h-14 w-full gap-1 overflow-hidden rounded-xl" role="img" aria-label={`Lead-Fluss: ${[...flow.active, flow.won].map((s) => `${s.label} ${s.count}`).join(", ")}`}>
            {[...flow.active, flow.won].map((s, i) => {
              const won = s.key === "abgeschlossen";
              const pct = bandTotal ? (s.count / bandTotal) * 100 : 0;
              if (s.count === 0) return null;
              return (
                <Link
                  key={s.key}
                  href={`/sales/leads?status=${s.key}`}
                  title={`${s.label}: ${s.count}`}
                  style={{ flexGrow: Math.max(pct, 3), flexBasis: 0 }}
                  className={cn(
                    "group flex min-w-[2.25rem] items-end justify-start px-2.5 pb-2 transition-[filter] hover:brightness-95 focus-visible:outline-offset-[-2px]",
                    won ? "ml-2 bg-emerald-600 text-white" : cn(FLOW_TONES[i], FLOW_TEXT[i]),
                  )}
                >
                  <span className="text-base font-semibold tabular-nums leading-none">{s.count}</span>
                </Link>
              );
            })}
          </div>
          <ol className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-4 xl:grid-cols-8">
            {[...flow.active, flow.won].map((s, i) => (
              <li key={s.key}>
                <Link href={`/sales/leads?status=${s.key}`} className="group flex items-center gap-2 text-xs text-neutral-600 hover:text-neutral-900">
                  <span className={cn("h-2.5 w-2.5 shrink-0 rounded-sm", s.key === "abgeschlossen" ? "bg-emerald-600" : FLOW_TONES[i])} aria-hidden />
                  <span className="leading-tight">{s.label}</span>
                  <span className="ml-auto tabular-nums text-neutral-400 group-hover:text-neutral-700">{s.count}</span>
                </Link>
              </li>
            ))}
          </ol>
          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
            <span className="font-medium text-neutral-600">Ausgeschieden</span>
            {flow.out.map((s) => (
              <Link key={s.key} href={`/sales/leads?status=${s.key}`} className="hover:text-neutral-900">
                {s.label} <span className="tabular-nums">{s.count}</span>
              </Link>
            ))}
          </p>
        </Section>
      ) : null}

      {/* Neue Leads · Woche · Kunden & Production */}
      <div className="grid gap-6 lg:grid-cols-3">
        {showSales ? (
          <Section
            title="Neue Leads"
            aside={
              <Link href="/sales/leads" className="text-xs font-medium text-brand-700 hover:underline">
                Alle Leads
              </Link>
            }
          >
            {home && home.newLeads.length ? (
              <ul className="-mx-2">
                {home.newLeads.slice(0, 6).map((l) => (
                  <li key={l.id}>
                    <Link href={`/sales/leads/${l.id}`} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-neutral-50">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-neutral-900">{l.name}</span>
                        <span className="block truncate text-xs text-neutral-500">
                          {(l.source && LEAD_SOURCE_LABELS[l.source as keyof typeof LEAD_SOURCE_LABELS]) || l.source || "Quelle unbekannt"}
                          {l.campaign ? ` · ${l.campaign}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-neutral-400">{ago(l.created_at)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-neutral-500">Keine neuen Leads in den letzten 7 Tagen.</p>
            )}
          </Section>
        ) : null}

        <Section
          title="Diese Woche"
          aside={
            <Link href="/calendar" className="text-xs font-medium text-brand-700 hover:underline">
              Kalender
            </Link>
          }
        >
          <ul className="space-y-1">
            {(home?.week ?? []).map((d, i) => {
              const date = new Date(`${d.date}T12:00:00Z`);
              const parts: string[] = [];
              if (d.counts.meeting) parts.push(`${d.counts.meeting} Termin${d.counts.meeting > 1 ? "e" : ""}`);
              if (d.counts.shoot) parts.push(`${d.counts.shoot} Shooting${d.counts.shoot > 1 ? "s" : ""}`);
              if (d.counts.followup) parts.push(`${d.counts.followup} Follow-up${d.counts.followup > 1 ? "s" : ""}`);
              if (d.counts.task) parts.push(`${d.counts.task} Aufgabe${d.counts.task > 1 ? "n" : ""}`);
              const rest = d.total - (d.counts.meeting ?? 0) - (d.counts.shoot ?? 0) - (d.counts.followup ?? 0) - (d.counts.task ?? 0);
              if (rest > 0) parts.push(`${rest} weitere`);
              return (
                <li key={d.date} className={cn("flex items-center gap-3 rounded-lg px-2 py-2", i === 0 && "bg-brand-50/60")}>
                  <span className={cn("w-12 shrink-0 text-xs", i === 0 ? "font-semibold text-brand-700" : "text-neutral-500")}>
                    {WEEKDAY[date.getUTCDay()]} {date.getUTCDate()}.
                  </span>
                  <span className="flex flex-1 items-center gap-1" aria-hidden>
                    {Array.from({ length: Math.min(d.total, 12) }).map((_, k) => (
                      <span key={k} className={cn("h-2 w-2 rounded-full", k < (d.counts.meeting ?? 0) ? "bg-brand-600" : "bg-neutral-300")} />
                    ))}
                  </span>
                  <span className="truncate text-right text-xs text-neutral-500">{parts.join(" · ") || "frei"}</span>
                </li>
              );
            })}
          </ul>
        </Section>

        <Section title="Kunden & Production">
          <div className="divide-y divide-neutral-100">
            {clients ? (
              <>
                <PulseRow label="Ohne Kontakt seit 30 Tagen" value={String(clients.noContact)} href="/clients/list" />
                <PulseRow label="Reporting-Calls diese Woche" value={String(clients.reportingThisWeek)} href="/clients/reporting" />
                <PulseRow label="Verträge laufen bald aus" value={String(clients.contractsExpiring)} href="/clients/contracts" />
              </>
            ) : null}
            {prod ? (
              <>
                <PulseRow label="Laufende Projekte" value={String(prod.runningProjects)} sub={prod.atRisk ? <span className="text-xs text-rose-600">{prod.atRisk} gefährdet</span> : undefined} href="/production/projects" />
                <PulseRow label="Shootings diese Woche" value={String(prod.shootsThisWeek)} href="/production/shoots" />
                <PulseRow label="Offene Freigaben" value={String(prod.openApprovals)} href="/production" />
              </>
            ) : null}
            {!clients && !prod ? (
              <p className="flex items-center gap-2 py-6 text-sm text-neutral-500">
                <Building2 className="h-4 w-4" aria-hidden /> Keine Daten verfügbar.
              </p>
            ) : null}
          </div>
        </Section>
      </div>
    </div>
  );
}
