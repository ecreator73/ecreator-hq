"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Images, Loader2, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  CREATOR_ASSET_CATEGORIES,
  CREATOR_ASSET_CATEGORY_LABELS,
} from "@/config/catalog";
import type { CreatorAsset } from "@/types/entities";
import {
  createCreatorAssetAction,
  deleteCreatorAssetAction,
} from "@/app/(app)/production/creators/actions";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Portfolio-Assets eines Creators: Grid mit Titel, Kategorie-Badge, Link und
 * Tags (loeschbar) plus Inline-Formular fuer neue Assets.
 */
export function PortfolioPanel({
  creatorId,
  items,
}: {
  creatorId: string;
  items: CreatorAsset[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(
    CREATOR_ASSET_CATEGORIES[0].key,
  );
  const [fileUrl, setFileUrl] = useState("");
  const [tags, setTags] = useState("");

  function add() {
    if (!title.trim() && !fileUrl.trim()) {
      setError("Titel oder Datei-URL ist erforderlich.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createCreatorAssetAction({
        creator_id: creatorId,
        title: title.trim() || undefined,
        category,
        file_url: fileUrl.trim() || undefined,
        tags: parseTags(tags),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setTitle("");
      setCategory(CREATOR_ASSET_CATEGORIES[0].key);
      setFileUrl("");
      setTags("");
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await deleteCreatorAssetAction(id, creatorId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <EmptyState
          icon={Images}
          title="Kein Portfolio hinterlegt"
          description="Verlinke Fotos, Videos oder UGC-Beispiele dieses Creators."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((asset) => (
            <div
              key={asset.id}
              className="flex flex-col rounded-lg border border-neutral-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-900">
                    {asset.title ?? "Ohne Titel"}
                  </p>
                  {asset.category ? (
                    <Badge tone="neutral" className="mt-1.5">
                      {CREATOR_ASSET_CATEGORY_LABELS[
                        asset.category as keyof typeof CREATOR_ASSET_CATEGORY_LABELS
                      ] ?? asset.category}
                    </Badge>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => remove(asset.id)}
                  disabled={pending}
                  className="shrink-0 rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  aria-label="Asset loeschen"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {asset.tags.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {asset.tags.map((tag) => (
                    <Badge key={tag} tone="brand">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : null}

              {asset.file_url ? (
                <a
                  href={asset.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Oeffnen
                </a>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-4">
        <p className="mb-3 text-sm font-medium text-neutral-700">
          Neues Asset
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-600">
              Titel
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Sommer-Kampagne 2026"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-600">
              Kategorie
            </span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputClass}
            >
              {CREATOR_ASSET_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-neutral-600">
              Datei-URL
            </span>
            <input
              type="url"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://…"
              className={inputClass}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-neutral-600">
              Tags (durch Komma getrennt)
            </span>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Beauty, Outdoor, Reels"
              className={inputClass}
            />
          </label>
        </div>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <div className="mt-3 flex justify-end">
          <Button size="sm" onClick={add} disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Hinzufuegen
          </Button>
        </div>
      </div>
    </div>
  );
}
