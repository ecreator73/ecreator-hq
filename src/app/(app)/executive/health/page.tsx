import type { Metadata } from "next";
import { HealthTable } from "@/components/executive/health-table";
import { executiveService } from "@/server/services";
import type { HealthRow } from "@/types/entities";

export const metadata: Metadata = { title: "Executive - Health" };

/** Erklaerung der vier Health-Stufen (aus dem Katalog). */
const STUFEN: { label: string; dot: string; text: string }[] = [
  {
    label: "Gesund",
    dot: "bg-green-500",
    text: "Keine offenen Probleme - alles laeuft planmaessig.",
  },
  {
    label: "Achtung",
    dot: "bg-blue-500",
    text: "Ein kleiner Punkt zum Beobachten, kein Handlungsdruck.",
  },
  {
    label: "Risiko",
    dot: "bg-amber-500",
    text: "Mehrere Probleme - bald gegensteuern.",
  },
  {
    label: "Kritisch",
    dot: "bg-red-500",
    text: "Akute Haeufung von Problemen - sofort handeln.",
  },
];

export default async function ExecutiveHealthPage() {
  // Rollen-Guard liegt im executive/layout.tsx (requireRole). Hier nur Daten laden.
  const ph = await executiveService.projectHealth().catch((): HealthRow[] => []);
  const ch = await executiveService.clientHealth().catch((): HealthRow[] => []);

  return (
    <div className="space-y-6">
      {/* Erklaerung der Stufen */}
      <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
        <p className="text-sm font-medium text-neutral-900">
          So lesen Sie den Health-Status
        </p>
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
          {STUFEN.map((s) => (
            <div key={s.label} className="flex items-start gap-2">
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${s.dot}`}
                aria-hidden
              />
              <div className="min-w-0">
                <dt className="text-sm font-medium text-neutral-900">
                  {s.label}
                </dt>
                <dd className="text-xs text-neutral-500">{s.text}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>

      {/* Zwei Health-Tabellen nebeneinander */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <HealthTable rows={ph} title="Projekt-Health" />
        <HealthTable rows={ch} title="Kunden-Health" />
      </div>
    </div>
  );
}
