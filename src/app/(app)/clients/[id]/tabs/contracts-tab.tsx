"use client";

import { StatusBadge } from "@/components/tasks/status-badge";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { statusLabel, CONTRACT_TYPES } from "@/config/catalog";
import { formatCHF, formatDate } from "@/lib/utils";
import { statusColorOf, Meta } from "../detail-ui";
import type { Contract } from "@/types/entities";

/** Laufzeit-Warnung fuer aktive Verträge mit Enddatum. */
function contractWarning(c: Contract) {
  if (c.status !== "active" || !c.end_date) return null;
  const daysLeft = Math.round((Date.parse(c.end_date) - Date.now()) / 86400000);
  if (daysLeft < 0) {
    return <Badge tone="red">Verlaengerung noetig</Badge>;
  }
  if (daysLeft <= 30) {
    return <Badge tone="amber">{`Laeuft in ${daysLeft} Tagen aus`}</Badge>;
  }
  return null;
}

export function ContractsTab({ contracts }: { contracts: Contract[] }) {
  if (contracts.length === 0) {
    return (
      <EmptyState
        title="Keine Verträge"
        description="Fuer diesen Kunden ist kein Vertrag erfasst."
      />
    );
  }

  return (
    <div className="space-y-3">
      {contracts.map((c) => {
        const typeLabel = c.contract_type
          ? CONTRACT_TYPES.find((t) => t.key === c.contract_type)?.label ??
            c.contract_type
          : null;
        const warning = contractWarning(c);

        return (
          <div
            key={c.id}
            className="space-y-3 rounded-xl border border-neutral-200 p-4 sm:p-5"
          >
            {/* Kopf */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h3 className="truncate text-sm font-semibold text-neutral-900">
                  {c.title}
                </h3>
                <StatusBadge
                  label={statusLabel("contract", c.status)}
                  color={statusColorOf("contract", c.status)}
                />
                {typeLabel ? <Badge tone="neutral">{typeLabel}</Badge> : null}
              </div>
              {warning ? <div className="shrink-0">{warning}</div> : null}
            </div>

            {/* Meta-Raster */}
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Meta label="Laufzeit">
                {c.start_date ? formatDate(c.start_date) : "—"}
                {" – "}
                {c.end_date ? formatDate(c.end_date) : "offen"}
              </Meta>
              <Meta label="Monatsbetrag">{formatCHF(c.value_monthly)}</Meta>
              <Meta label="Gesamtwert">{formatCHF(c.value_total)}</Meta>
              <Meta label="Kuendigungsfrist">
                {c.cancellation_notice_days
                  ? `${c.cancellation_notice_days} Tage`
                  : "—"}
              </Meta>
            </dl>
          </div>
        );
      })}
    </div>
  );
}
