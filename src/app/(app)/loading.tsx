/**
 * Globales Lade-Skeleton fuer alle Bereiche unter (app).
 * Sorgt dafuer, dass ein Navigations-Klick SOFORT sichtbar reagiert
 * (Skeleton im Inhaltsbereich), waehrend der Server die Daten laedt.
 */
export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Laedt…">
      {/* Seitentitel */}
      <div className="space-y-2">
        <div className="h-7 w-56 rounded-lg bg-neutral-200" />
        <div className="h-4 w-80 rounded bg-neutral-100" />
      </div>

      {/* KPI-Reihe */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-neutral-200 bg-white p-5">
            <div className="h-4 w-24 rounded bg-neutral-100" />
            <div className="mt-3 h-7 w-16 rounded bg-neutral-200" />
          </div>
        ))}
      </div>

      {/* Inhaltsblöcke */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 lg:col-span-2">
          <div className="h-5 w-40 rounded bg-neutral-200" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-neutral-100" />
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="h-5 w-32 rounded bg-neutral-200" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-neutral-100" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
