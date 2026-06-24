"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, Pencil, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PromptLibForm } from "@/components/knowledge/prompt-lib-form";
import { deletePromptLibraryAction } from "@/app/(app)/operations/actions";
import { PROMPT_LIBRARY_CATEGORY_LABELS } from "@/config/catalog";
import type { PromptLibraryItem } from "@/types/entities";

export function PromptCard({ prompt }: { prompt: PromptLibraryItem }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const categoryLabel = prompt.category
    ? PROMPT_LIBRARY_CATEGORY_LABELS[
        prompt.category as keyof typeof PROMPT_LIBRARY_CATEGORY_LABELS
      ] ?? prompt.category
    : null;

  function copy() {
    if (!prompt.prompt) return;
    navigator.clipboard.writeText(prompt.prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await deletePromptLibraryAction(prompt.id);
      if (result.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <div className="flex h-full flex-col rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-colors hover:border-brand-300">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex-1 text-left focus:outline-none"
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-semibold text-neutral-900">
              {prompt.title}
            </h3>
            {categoryLabel ? <Badge tone="brand">{categoryLabel}</Badge> : null}
          </div>
          {prompt.prompt ? (
            <p className="mt-2 line-clamp-3 text-sm text-neutral-500">
              {prompt.prompt}
            </p>
          ) : null}
          {prompt.tags.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {prompt.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </button>

        <div className="mt-3 flex items-center justify-end border-t border-neutral-100 pt-3">
          <button
            type="button"
            onClick={copy}
            disabled={!prompt.prompt}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:pointer-events-none disabled:opacity-50"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-600" />
                Kopiert
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Kopieren
              </>
            )}
          </button>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(false);
        }}
        title={editing ? "Prompt bearbeiten" : prompt.title}
        size="lg"
      >
        {editing ? (
          <PromptLibForm
            mode="edit"
            id={prompt.id}
            initial={{
              title: prompt.title,
              category: prompt.category,
              prompt: prompt.prompt,
              tags: prompt.tags,
            }}
            onCancel={() => setEditing(false)}
            onDone={() => {
              setEditing(false);
              setOpen(false);
              router.refresh();
            }}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {categoryLabel ? <Badge tone="brand">{categoryLabel}</Badge> : null}
              {prompt.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <pre className="whitespace-pre-wrap break-words font-mono text-sm text-neutral-800">
                {prompt.prompt?.trim() ? prompt.prompt : "Kein Prompt-Text hinterlegt."}
              </pre>
            </div>

            {error ? (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            ) : null}

            <div className="flex items-center justify-between gap-2 pt-1">
              <Button
                type="button"
                variant="danger"
                size="sm"
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
              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={copy}>
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" />
                      Kopiert
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Kopieren
                    </>
                  )}
                </Button>
                <Button type="button" size="sm" onClick={() => setEditing(true)}>
                  <Pencil className="h-4 w-4" />
                  Bearbeiten
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
