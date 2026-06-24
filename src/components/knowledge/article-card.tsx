"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/tasks/status-badge";
import { ArticleForm } from "@/components/knowledge/article-form";
import {
  KNOWLEDGE_CATEGORY_LABELS,
  ARTICLE_STATUS_LABELS,
  articleStatusColor,
} from "@/config/catalog";
import { deleteArticleAction } from "@/app/(app)/operations/actions";
import { formatDate } from "@/lib/utils";
import type { KnowledgeArticle } from "@/types/entities";

export function ArticleCard({ article }: { article: KnowledgeArticle }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function close() {
    setOpen(false);
    setEditing(false);
    setError(null);
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await deleteArticleAction(article.id);
      if (result.ok) {
        close();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  const categoryLabel = article.category
    ? (KNOWLEDGE_CATEGORY_LABELS as Record<string, string>)[article.category] ??
      article.category
    : null;
  const statusLabel =
    (ARTICLE_STATUS_LABELS as Record<string, string>)[article.status] ??
    article.status;

  return (
    <>
      <Card
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="cursor-pointer p-4 transition-colors hover:border-neutral-300 hover:bg-neutral-50/50"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-neutral-900">
            {article.title}
          </h3>
          <StatusBadge
            label={statusLabel}
            color={articleStatusColor(article.status)}
          />
        </div>

        {categoryLabel ? (
          <div className="mt-2">
            <Badge tone="brand">{categoryLabel}</Badge>
          </div>
        ) : null}

        {article.tags.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {article.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        ) : null}

        <p className="mt-3 text-xs text-neutral-400">
          Aktualisiert {formatDate(article.updated_at)}
        </p>
      </Card>

      <Modal
        open={open}
        onClose={close}
        title={editing ? "Artikel bearbeiten" : article.title}
        size="lg"
      >
        {editing ? (
          <ArticleForm
            mode="edit"
            id={article.id}
            initial={{
              title: article.title,
              content: article.content,
              category: article.category,
              status: article.status,
              tags: article.tags,
            }}
            onCancel={() => setEditing(false)}
            onDone={() => {
              close();
              router.refresh();
            }}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {categoryLabel ? <Badge tone="brand">{categoryLabel}</Badge> : null}
              <StatusBadge
                label={statusLabel}
                color={articleStatusColor(article.status)}
              />
              {article.tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>

            {article.content ? (
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
                {article.content}
              </div>
            ) : (
              <p className="text-sm text-neutral-400">Kein Inhalt hinterlegt.</p>
            )}

            {error ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
              <Button
                type="button"
                variant="danger"
                onClick={remove}
                disabled={pending}
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Loeschen
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-4 w-4" />
                Bearbeiten
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
