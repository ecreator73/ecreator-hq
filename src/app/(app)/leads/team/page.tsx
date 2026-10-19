import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { teamService } from "@/server/services";
import { loadLeadWork, teamRows } from "@/server/services/lead-work.service";
import { DataTable } from "@/components/marketing/data-table";

export const metadata: Metadata = { title: "Leads · Team" };

export default async function TeamPage() {
  await requireUser();
  const [{ leads, calls, today }, members] = await Promise.all([loadLeadWork(), teamService.listMembers().catch(() => [])]);
  const rows = teamRows(leads, calls, members, today).map((r) => ({ ...r }));
  const withoutAccount = [...new Set(leads.filter((l) => !l.ownerId && l.owner).map((l) => l.owner as string))];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-neutral-900">Team</h2>
        <p className="text-sm text-neutral-500">Wer welche Leads hat, wer telefoniert und mit welchem Ergebnis.</p>
      </div>
      <DataTable
        columns={[
          { key: "name", label: "Mitarbeiter" },
          { key: "open", label: "Offene Leads", format: "int" },
          { key: "overdue", label: "Überfällig", format: "int" },
          { key: "withoutNext", label: "Ohne nächsten Schritt", format: "int" },
          { key: "calls7", label: "Anrufe 7 T.", format: "int" },
          { key: "calls30", label: "Anrufe 30 T.", format: "int" },
          { key: "reachRate30", label: "Erreicht-Quote", format: "pct" },
          { key: "appointments30", label: "Termine 30 T.", format: "int" },
          { key: "won30", label: "Gewonnen 30 T.", format: "int" },
        ]}
        rows={rows}
        defaultSort={{ key: "open", dir: "desc" }}
      />
      {withoutAccount.length ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Zuständig, aber ohne eCreator-OS-Konto: {withoutAccount.join(", ")}. Konto unter Einstellungen → Benutzer anlegen, dann neu zuweisen.
        </p>
      ) : null}
    </div>
  );
}
