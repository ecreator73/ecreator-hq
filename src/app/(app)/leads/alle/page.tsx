import type { Metadata } from "next";
import Link from "next/link";
import { Columns3, Rows3 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { leadsService, teamService } from "@/server/services";
import { loadLeadWork } from "@/server/services/lead-work.service";
import { AllLeads } from "@/components/leads/all-leads";
import { LeadPipeline } from "@/components/sales/lead-pipeline";
import type { LeadWithRelations } from "@/types/entities";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Leads · Alle" };

export default async function AllLeadsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser();
  const sp = await searchParams;
  const kanban = sp.view === "kanban";
  const [work, members, board] = await Promise.all([
    kanban ? Promise.resolve(null) : loadLeadWork(),
    teamService.listMembers().catch(() => []),
    kanban ? leadsService.board().catch(() => [] as LeadWithRelations[]) : Promise.resolve([] as LeadWithRelations[]),
  ]);

  const toggle = (on: boolean, href: string, label: string, Icon: React.ComponentType<{ className?: string }>) => (
    <Link href={href} aria-current={on ? "page" : undefined} className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium", on ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800")}>
      <Icon className="h-4 w-4" aria-hidden /> {label}
    </Link>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-neutral-900">Alle Leads</h2>
          <p className="text-sm text-neutral-500">Status und Zuständigkeit direkt ändern, mehrere Leads auf einmal bearbeiten, als CSV exportieren.</p>
        </div>
        <div className="inline-flex rounded-lg bg-neutral-100 p-0.5">
          {toggle(!kanban, "/leads/alle", "Tabelle", Rows3)}
          {toggle(kanban, "/leads/alle?view=kanban", "Kanban", Columns3)}
        </div>
      </div>
      {kanban ? <LeadPipeline leads={board} /> : <AllLeads leads={work?.leads ?? []} members={members} />}
    </div>
  );
}
