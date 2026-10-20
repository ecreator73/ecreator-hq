import type { Metadata } from "next";
import Link from "next/link";
import { CalendarSearch, Clapperboard, Film, PackageCheck, Wallet } from "lucide-react";
import { StatusBadge } from "@/components/tasks/status-badge";
import { ShootQuickCreate } from "@/components/production/shoot-quick-create";
import { productionCrmService, type ShootOverview } from "@/server/services/production-crm.service";
import { SHOOT_STATUSES, statusLabel } from "@/config/catalog";
import { formatCHF, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Production - Shootings" };

const TZ = "Europe/Zurich";
const dDay = new Intl.DateTimeFormat("de-CH", { timeZone: TZ, day: "2-digit" });
const dMon = new Intl.DateTimeFormat("de-CH", { timeZone: TZ, month: "short" });
const dTime = new Intl.DateTimeFormat("de-CH", { timeZone: TZ, weekday: "short", hour: "2-digit", minute: "2-digit" });
const dShort = new Intl.DateTimeFormat("de-CH", { timeZone: TZ, day: "2-digit", month: "2-digit" });
const color = (k: string) => SHOOT_STATUSES.find((s) => s.key === k)?.color;

function models(s: ShootOverview) {
  const names = s.assignments.filter((a) => a.status !== "rejected").map((a) => [a.creator?.first_name, a.creator?.last_name?.slice(0, 1)].filter(Boolean).join(" ") + (a.creator?.last_name ? "." : ""));
  return names.length ? names.join(", ") : null;
}

function Row({ s, now }: { s: ShootOverview; now: string }) {
  const d = s.shooting_date ? new Date(s.shooting_date) : null;
  const late = s.delivery_deadline && s.delivery_deadline < now.slice(0, 10) && !["delivered", "cancelled"].includes(s.status);
  const m = models(s);
  return (
    <li>
      <Link href={`/production/shoots/${s.id}`} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-neutral-50/70">
        <div className={cn("flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border text-center", d && s.final_date_set !== false ? "border-neutral-200 bg-white" : "border-dashed border-amber-300 bg-amber-50/50")}>
          {d ? (
            <>
              <span className="text-base font-semibold leading-none tabular-nums text-neutral-900">{dDay.format(d)}</span>
              <span className="mt-0.5 text-[10px] uppercase text-neutral-500">{dMon.format(d)}</span>
            </>
          ) : (
            <span className="text-[10px] text-amber-700">offen</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium text-neutral-900">{s.title}</span>
            <StatusBadge label={statusLabel("shoot", s.status)} color={color(s.status)} />
            {s.status === "date_search" && s.final_date_set === false ? <span className="text-xs text-amber-700">{s.options_count === 1 ? "1 Terminvorschlag" : `${s.options_count} Terminvorschläge`}</span> : null}
          </div>
          <p className="mt-0.5 truncate text-sm text-neutral-500">
            {[s.client?.name ?? "eCreator intern", d ? dTime.format(d) : null, s.duration_hours ? `${s.duration_hours} Std.` : null, s.location, m ? `Model: ${m}` : null].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="hidden shrink-0 text-right text-xs sm:block">
          {s.model_fee ? (
            <p className={s.model_paid ? "text-neutral-400" : "text-amber-700"}>
              Model {formatCHF(s.model_fee)} {s.model_paid ? "bezahlt" : "offen"}
            </p>
          ) : null}
          {s.delivery_deadline ? <p className={late ? "font-medium text-rose-700" : "text-neutral-500"}>Lieferung bis {dShort.format(new Date(`${s.delivery_deadline}T12:00:00`))}</p> : null}
          {s.scripts_count ? <p className="text-neutral-400">{s.scripts_count} Skript{s.scripts_count > 1 ? "e" : ""}</p> : null}
        </div>
      </Link>
    </li>
  );
}

function Group({ title, hint, items, now, empty }: { title: string; hint: string; items: ShootOverview[]; now: string; empty: string }) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white">
      <header className="flex items-baseline justify-between gap-3 border-b border-neutral-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-neutral-900">
          {title} <span className="ml-1 font-normal tabular-nums text-neutral-400">{items.length}</span>
        </h2>
        <p className="truncate text-xs text-neutral-500">{hint}</p>
      </header>
      {items.length ? <ul className="divide-y divide-neutral-100">{items.map((s) => <Row key={s.id} s={s} now={now} />)}</ul> : <p className="px-4 py-6 text-center text-sm text-neutral-400">{empty}</p>}
    </section>
  );
}

export default async function ShootsPage() {
  const shoots = await productionCrmService.shoots().catch((): ShootOverview[] => []);
  const now = new Date().toISOString();
  const in7 = new Date(Date.now() + 7 * 86_400_000).toISOString();

  const search = shoots.filter((s) => s.status === "date_search");
  const upcoming = shoots.filter((s) => ["planned", "confirmed", "rescheduled"].includes(s.status));
  const post = shoots.filter((s) => ["done", "editing"].includes(s.status)).sort((a, b) => (a.delivery_deadline ?? "9").localeCompare(b.delivery_deadline ?? "9"));
  const closed = shoots.filter((s) => ["delivered", "cancelled"].includes(s.status)).reverse();
  const week = upcoming.filter((s) => s.shooting_date && s.shooting_date >= now && s.shooting_date <= in7).length;
  const unpaid = shoots.filter((s) => s.model_fee && !s.model_paid && s.status !== "cancelled");
  const unpaidSum = unpaid.reduce((n, s) => n + (s.model_fee ?? 0), 0);
  const late = post.filter((s) => s.delivery_deadline && s.delivery_deadline < now.slice(0, 10)).length;

  const kpis = [
    { icon: Clapperboard, label: "Nächste 7 Tage", value: week, sub: `${upcoming.length} geplant insgesamt` },
    { icon: CalendarSearch, label: "Terminsuche", value: search.length, sub: "warten auf Termin", tone: search.length ? "text-amber-700" : undefined },
    { icon: Film, label: "Schnitt & Lieferung", value: post.length, sub: late ? `${late} Lieferfrist überschritten` : "alle im Plan", tone: late ? "text-rose-700" : undefined },
    { icon: Wallet, label: "Model-Honorare offen", value: formatCHF(unpaidSum), sub: `${unpaid.length} Shooting${unpaid.length === 1 ? "" : "s"}` },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">Vom Terminvorschlag bis zur Lieferung, mit Model, Skripten und Honorar.</p>
        <ShootQuickCreate />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="flex items-center gap-1.5 text-xs text-neutral-500">
              <k.icon className="h-3.5 w-3.5" aria-hidden /> {k.label}
            </p>
            <p className={cn("mt-1 text-2xl font-semibold tabular-nums text-neutral-900", k.tone)}>{k.value}</p>
            <p className="text-xs text-neutral-400">{k.sub}</p>
          </div>
        ))}
      </div>
      <Group title="Terminsuche" hint="Vorschläge mit Kunde und Model abstimmen" items={search} now={now} empty="Kein Shooting wartet auf einen Termin." />
      <Group title="Anstehend" hint="Termin steht" items={upcoming} now={now} empty="Keine anstehenden Shootings." />
      <Group title="Schnitt & Lieferung" hint="nach Lieferfrist sortiert" items={post} now={now} empty="Nichts in der Nachbearbeitung." />
      {closed.length ? (
        <details className="group rounded-xl border border-neutral-200 bg-white">
          <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-semibold text-neutral-900">
            <PackageCheck className="h-4 w-4 text-neutral-400" aria-hidden /> Geliefert und abgesagt <span className="font-normal tabular-nums text-neutral-400">{closed.length}</span>
          </summary>
          <ul className="divide-y divide-neutral-100 border-t border-neutral-100">{closed.map((s) => <Row key={s.id} s={s} now={now} />)}</ul>
        </details>
      ) : null}
    </div>
  );
}
