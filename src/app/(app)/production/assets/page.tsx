import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { AssetQuickCreate } from "@/components/production/asset-quick-create";
import {
  RequestApprovalButton,
  ApprovalDecisionButtons,
} from "@/components/production/approval-actions";
import { assetsService, approvalsService } from "@/server/services";
import type { AssetWithRelations, ApprovalWithRelations } from "@/types/entities";
import {
  APPROVAL_STATUSES,
  ASSET_CATEGORY_LABELS,
  statusLabel,
} from "@/config/catalog";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Production - Assets & Freigaben" };

function categoryLabel(category: string | null): string {
  if (!category) return "-";
  return (
    ASSET_CATEGORY_LABELS[category as keyof typeof ASSET_CATEGORY_LABELS] ??
    category
  );
}

function approvalStatusColor(status: string | null): string | undefined {
  if (!status) return undefined;
  return APPROVAL_STATUSES.find((s) => s.key === status)?.color;
}

function AssetRow({ asset }: { asset: AssetWithRelations }) {
  return (
    <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          {asset.file_url ? (
            <a
              href={asset.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-neutral-900 hover:text-brand-700"
            >
              {asset.title ?? "Ohne Titel"}
            </a>
          ) : (
            <span className="font-medium text-neutral-900">
              {asset.title ?? "Ohne Titel"}
            </span>
          )}
          <Badge tone="neutral">{categoryLabel(asset.category)}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-500">
          <span>{asset.client?.name ?? "Kein Kunde"}</span>
          {asset.uploader?.full_name ? (
            <>
              <span aria-hidden="true">-</span>
              <span>{asset.uploader.full_name}</span>
            </>
          ) : null}
        </div>
        {asset.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {asset.tags.map((tag) => (
              <Badge key={tag} tone="brand">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
      <div className="shrink-0">
        <RequestApprovalButton
          assetId={asset.id}
          clientId={asset.client_id ?? undefined}
        />
      </div>
    </div>
  );
}

function ApprovalRow({ approval }: { approval: ApprovalWithRelations }) {
  return (
    <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-neutral-900">
            {approval.title ?? approval.asset?.title ?? "Freigabe"}
          </span>
          <StatusBadge
            label={statusLabel("approval", approval.status)}
            color={approvalStatusColor(approval.status)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-500">
          <span>{approval.client?.name ?? "Kein Kunde"}</span>
          <span aria-hidden="true">-</span>
          <span>Angefragt {formatDate(approval.requested_at)}</span>
        </div>
      </div>
      <div className="shrink-0">
        <ApprovalDecisionButtons approvalId={approval.id} />
      </div>
    </div>
  );
}

export default async function AssetsPage() {
  const [assets, approvals]: [AssetWithRelations[], ApprovalWithRelations[]] =
    await Promise.all([
      assetsService.list().catch(() => []),
      approvalsService.list().catch(() => []),
    ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Asset-Bibliothek ({assets.length})</CardTitle>
            <AssetQuickCreate />
          </div>
        </CardHeader>
        <CardContent>
          {assets.length === 0 ? (
            <EmptyState
              title="Keine Assets vorhanden"
              description="Lege ein Asset an, um Logos, Videos, Bilder und Dokumente zentral zu verwalten."
            />
          ) : (
            <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
              {assets.map((asset) => (
                <AssetRow key={asset.id} asset={asset} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Freigaben ({approvals.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {approvals.length === 0 ? (
            <EmptyState
              title="Keine Freigaben"
              description="Fordere zu einem Asset eine Freigabe an, um sie hier zu verfolgen und zu entscheiden."
            />
          ) : (
            <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
              {approvals.map((approval) => (
                <ApprovalRow key={approval.id} approval={approval} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
