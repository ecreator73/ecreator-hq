import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { tasksService, teamService } from "@/server/services";
import { callStats, loadLeadWork } from "@/server/services/lead-work.service";
import { WorkList } from "@/components/leads/work-list";

export const metadata: Metadata = { title: "Leads · Mein Bereich" };

function Tile({ label, value, href }: { label: string; value: number; href?: string }) {
  const body = (
    <>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">{value}</p>
    </>
  );
  return href ? (
    <Link href={href} className="rounded-xl border border-neutral-200 bg-white p-4 hover:border-neutral-300">
      {body}
    </Link>
  ) : (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">{body}</div>
  );
}

export default async function MyLeadsPage() {
  const user = await requireUser();
  const [{ leads, calls, today }, members, tasks] = await Promise.all([
    loadLeadWork(),
    teamService.listMembers().catch(() => []),
    tasksService
      .list({ assigned_to: user.id, excludeStatus: ["done", "archived"] }, { pageSize: 8, sort: { column: "due_date", ascending: true } })
      .catch(() => ({ rows: [], total: 0 })),
  ]);
  const mine = leads.filter((l) => l.ownerId === user.id && l.bucket !== "archive");
  const myCalls = calls.filter((c) => c.byId === user.id || (!c.byId && c.by === user.fullName));
  const s = callStats(myCalls, today, today);
  const overdue = mine.filter((l) => l.bucket === "overdue").length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-neutral-900">Mein Bereich</h2>
        <p className="text-sm text-neutral-500">Deine Leads, deine Anrufe und deine Aufgaben.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Meine offenen Leads" value={mine.length} />
        <Tile label="Davon überfällig" value={overdue} />
        <Tile label="Meine Anrufe heute" value={s.calls} />
        <Tile label="Meine offenen Aufgaben" value={tasks.total} href="/tasks/mine" />
      </div>
      {tasks.rows.length ? (
        <section className="rounded-xl border border-neutral-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-neutral-900">Aufgaben</h3>
          <ul className="divide-y divide-neutral-100">
            {(tasks.rows as Array<{ id: string; title: string; due_date: string | null }>).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <Link href={`/tasks/${t.id}`} className="truncate text-neutral-800 hover:underline">
                  {t.title}
                </Link>
                <span className={t.due_date && t.due_date < today ? "text-xs font-medium text-rose-600" : "text-xs text-neutral-500"}>
                  {t.due_date ? t.due_date.split("-").reverse().join(".") : "ohne Datum"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {mine.length ? (
        <WorkList leads={mine} members={members} today={today} />
      ) : (
        <p className="rounded-xl border border-dashed border-neutral-300 bg-white px-4 py-10 text-center text-sm text-neutral-500">
          Dir sind keine offenen Leads zugewiesen. In der{" "}
          <Link href="/leads" className="font-medium text-brand-700 hover:underline">
            Arbeitsliste
          </Link>{" "}
          übernimmst du einen Lead automatisch, sobald du ihn anrufst.
        </p>
      )}
    </div>
  );
}
