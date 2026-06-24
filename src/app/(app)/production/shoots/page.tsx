import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { ShootQuickCreate } from "@/components/production/shoot-quick-create";
import { ShootMarkButtons } from "@/components/production/shoot-mark-buttons";
import { shootsService } from "@/server/services";
import type { ShootWithRelations } from "@/types/entities";
import { SHOOT_STATUSES, statusLabel } from "@/config/catalog";
import { formatDate } from "@/lib/utils";
import { today } from "@/lib/dates";

export const metadata: Metadata = { title: "Production - Shootings" };

function shootStatusColor(status: string | null): string | undefined {
  if (!status) return undefined;
  return SHOOT_STATUSES.find((s) => s.key === status)?.color;
}

function ShootRow({ shoot }: { shoot: ShootWithRelations }) {
  return (
    <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-neutral-900">
            {shoot.title ?? "Ohne Titel"}
          </span>
          <StatusBadge
            label={statusLabel("shoot", shoot.status)}
            color={shootStatusColor(shoot.status)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-500">
          <span>{shoot.client?.name ?? "Kein Kunde"}</span>
          <span aria-hidden="true">-</span>
          <span>
            {shoot.shooting_date ? formatDate(shoot.shooting_date) : "Kein Datum"}
          </span>
          {shoot.location ? (
            <>
              <span aria-hidden="true">-</span>
              <span>{shoot.location}</span>
            </>
          ) : null}
          {shoot.videographer ? (
            <>
              <span aria-hidden="true">-</span>
              <span>{shoot.videographer}</span>
            </>
          ) : null}
        </div>
      </div>
      <div className="shrink-0">
        <ShootMarkButtons shootId={shoot.id} />
      </div>
    </div>
  );
}

function ShootSection({
  title,
  shoots,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  shoots: ShootWithRelations[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {title} ({shoots.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {shoots.length === 0 ? (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        ) : (
          <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
            {shoots.map((shoot) => (
              <ShootRow key={shoot.id} shoot={shoot} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default async function ShootsPage() {
  const t = today();

  const shoots = await shootsService.list().catch(() => []);

  const upcoming = shoots.filter(
    (s) => !s.shooting_date || s.shooting_date >= t,
  );
  const past = shoots.filter((s) => s.shooting_date && s.shooting_date < t);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <ShootQuickCreate />
      </div>

      <ShootSection
        title="Anstehende Shootings"
        shoots={upcoming}
        emptyTitle="Keine anstehenden Shootings"
        emptyDescription="Es sind aktuell keine Shootings geplant. Lege ein neues Shooting an, um Drehs zu planen."
      />

      <ShootSection
        title="Vergangene Shootings"
        shoots={past}
        emptyTitle="Keine vergangenen Shootings"
        emptyDescription="Hier erscheinen abgeschlossene oder abgesagte Shootings."
      />
    </div>
  );
}
