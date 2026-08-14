import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronRight,
  Download,
  Folder,
  FolderOpen,
  Building2,
  Files,
} from "lucide-react";
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
  ASSET_CATEGORIES,
  ASSET_CATEGORY_LABELS,
  statusLabel,
} from "@/config/catalog";
import { cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Production - Assets & Freigaben" };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

/** Sammel-Ordner fuer Assets ohne Kategorie. */
const NO_CATEGORY = "ohne";

function categoryLabel(category: string | null): string {
  if (!category) return "Ohne Kategorie";
  return (
    ASSET_CATEGORY_LABELS[category as keyof typeof ASSET_CATEGORY_LABELS] ??
    category
  );
}

function approvalStatusColor(status: string | null): string | undefined {
  if (!status) return undefined;
  return APPROVAL_STATUSES.find((s) => s.key === status)?.color;
}

/** Baut einen Link auf diese Seite und behaelt den jeweils anderen Filter bei. */
function folderHref(ordner: string | null, kunde: string | null): string {
  const params = new URLSearchParams();
  if (ordner) params.set("ordner", ordner);
  if (kunde) params.set("kunde", kunde);
  const qs = params.toString();
  return qs ? `/production/assets?${qs}` : "/production/assets";
}

function FolderTile({
  label,
  count,
  href,
  active,
  icon: Icon,
}: {
  label: string;
  count: number;
  href: string;
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-white p-4 shadow-sm transition-colors",
        active
          ? "border-brand-500 bg-brand-50/60 ring-1 ring-brand-200"
          : "border-neutral-200 hover:border-brand-300 hover:bg-brand-50/40",
      )}
    >
      <span
        className={cn(
          "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          active
            ? "bg-brand-100 text-brand-700"
            : "bg-neutral-100 text-neutral-500",
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-neutral-900">
          {label}
        </span>
        <span className="block text-xs text-neutral-500">
          {count} {count === 1 ? "Datei" : "Dateien"}
        </span>
      </span>
    </Link>
  );
}

function AssetCard({ asset }: { asset: AssetWithRelations }) {
  return (
    <div className="flex flex-col justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="min-w-0 space-y-2">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
            <Files className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            {asset.file_url ? (
              <a
                href={asset.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate text-sm font-medium text-neutral-900 hover:text-brand-700"
              >
                {asset.title ?? "Ohne Titel"}
              </a>
            ) : (
              <span className="block truncate text-sm font-medium text-neutral-900">
                {asset.title ?? "Ohne Titel"}
              </span>
            )}
            <span className="mt-0.5 block text-xs text-neutral-500">
              {asset.client?.name ?? "Kein Kunde"}
            </span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="neutral">{categoryLabel(asset.category)}</Badge>
          {asset.tags.map((tag) => (
            <Badge key={tag} tone="brand">
              {tag}
            </Badge>
          ))}
        </div>

        <p className="text-xs text-neutral-500">
          Hochgeladen {formatDate(asset.created_at)}
          {asset.uploader?.full_name ? ` von ${asset.uploader.full_name}` : ""}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
        {asset.file_url ? (
          <a
            href={asset.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            <Download className="h-3.5 w-3.5" />
            Oeffnen
          </a>
        ) : (
          <span className="text-xs text-neutral-400">Keine Datei hinterlegt</span>
        )}
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

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const ordnerParam = one(sp.ordner) || null;
  const kundeParam = one(sp.kunde) || null;

  const [assets, approvals]: [AssetWithRelations[], ApprovalWithRelations[]] =
    await Promise.all([
      assetsService.list().catch(() => []),
      approvalsService.list().catch(() => []),
    ]);

  // Ordner-Zaehler je Kategorie (inkl. Sammel-Ordner "Ohne Kategorie").
  const countByCategory = new Map<string, number>();
  const countByClient = new Map<string, { name: string; count: number }>();
  for (const a of assets) {
    const key = a.category ?? NO_CATEGORY;
    countByCategory.set(key, (countByCategory.get(key) ?? 0) + 1);
    if (a.client) {
      const entry = countByClient.get(a.client.id);
      countByClient.set(a.client.id, {
        name: a.client.name,
        count: (entry?.count ?? 0) + 1,
      });
    }
  }

  const categoryFolders = [
    ...ASSET_CATEGORIES.map((c) => ({
      key: c.key as string,
      label: c.label,
      count: countByCategory.get(c.key) ?? 0,
    })),
    ...(countByCategory.get(NO_CATEGORY)
      ? [
          {
            key: NO_CATEGORY,
            label: "Ohne Kategorie",
            count: countByCategory.get(NO_CATEGORY) ?? 0,
          },
        ]
      : []),
  ];

  const clientFolders = [...countByClient.entries()]
    .map(([id, v]) => ({ key: id, label: v.name, count: v.count }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const activeCategory =
    ordnerParam && categoryFolders.some((f) => f.key === ordnerParam)
      ? ordnerParam
      : null;
  const activeClient =
    kundeParam && clientFolders.some((f) => f.key === kundeParam)
      ? kundeParam
      : null;

  const visible = assets.filter((a) => {
    if (activeCategory && (a.category ?? NO_CATEGORY) !== activeCategory) {
      return false;
    }
    if (activeClient && a.client?.id !== activeClient) return false;
    return true;
  });

  const activeCategoryLabel =
    categoryFolders.find((f) => f.key === activeCategory)?.label ?? null;
  const activeClientLabel =
    clientFolders.find((f) => f.key === activeClient)?.label ?? null;

  const listTitle = activeCategoryLabel ?? "Alle Assets";

  return (
    <div className="space-y-6">
      {/* Ordner nach Kategorie */}
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Ordner ({assets.length} Dateien insgesamt)</CardTitle>
              <p className="mt-1 text-sm text-neutral-500">
                Waehle einen Ordner, um nur dessen Dateien zu sehen.
              </p>
            </div>
            <AssetQuickCreate />
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            <FolderTile
              label="Alle"
              count={assets.length}
              href={folderHref(null, activeClient)}
              active={activeCategory === null}
              icon={activeCategory === null ? FolderOpen : Folder}
            />
            {categoryFolders.map((f) => (
              <FolderTile
                key={f.key}
                label={f.label}
                count={f.count}
                href={folderHref(f.key, activeClient)}
                active={activeCategory === f.key}
                icon={activeCategory === f.key ? FolderOpen : Folder}
              />
            ))}
          </div>

          {clientFolders.length > 0 ? (
            <div className="space-y-3 border-t border-neutral-100 pt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Nach Kunde
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                <FolderTile
                  label="Alle Kunden"
                  count={assets.length}
                  href={folderHref(activeCategory, null)}
                  active={activeClient === null}
                  icon={Building2}
                />
                {clientFolders.map((f) => (
                  <FolderTile
                    key={f.key}
                    label={f.label}
                    count={f.count}
                    href={folderHref(activeCategory, f.key)}
                    active={activeClient === f.key}
                    icon={Building2}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Dateien im gewaehlten Ordner */}
      <Card>
        <CardHeader className="gap-2">
          {activeCategory || activeClient ? (
            <nav
              aria-label="Pfad"
              className="flex flex-wrap items-center gap-1 text-sm text-neutral-500"
            >
              <Link
                href="/production/assets"
                className="font-medium text-neutral-600 hover:text-brand-700"
              >
                Assets
              </Link>
              {activeCategoryLabel ? (
                <>
                  <ChevronRight className="h-4 w-4 text-neutral-300" />
                  <span className="text-neutral-900">{activeCategoryLabel}</span>
                </>
              ) : null}
              {activeClientLabel ? (
                <>
                  <ChevronRight className="h-4 w-4 text-neutral-300" />
                  <span className="text-neutral-900">{activeClientLabel}</span>
                </>
              ) : null}
            </nav>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>
              {listTitle} ({visible.length})
              {activeClientLabel ? ` - ${activeClientLabel}` : ""}
            </CardTitle>
            {activeCategory || activeClient ? (
              <Link
                href="/production/assets"
                className="inline-flex h-9 items-center rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50"
              >
                Zurueck zu allen Ordnern
              </Link>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {visible.length === 0 ? (
            <EmptyState
              icon={Folder}
              title={
                assets.length === 0
                  ? "Noch keine Assets vorhanden"
                  : "Dieser Ordner ist leer"
              }
              description={
                assets.length === 0
                  ? "Lege ein Asset an, um Logos, Videos, Bilder und Dokumente zentral zu verwalten."
                  : "In diesem Ordner liegt noch keine Datei. Lege eine an oder waehle einen anderen Ordner."
              }
              action={<AssetQuickCreate />}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {visible.map((asset) => (
                <AssetCard key={asset.id} asset={asset} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Freigaben */}
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
