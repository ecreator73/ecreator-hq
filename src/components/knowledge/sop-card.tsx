"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ListChecks, Loader2, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/tasks/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  KNOWLEDGE_CATEGORY_LABELS,
  SOP_STATUS_LABELS,
  sopStatusColor,
} from "@/config/catalog";
import { deleteSopAction } from "@/app/(app)/operations/actions";
import { SopForm } from "@/components/knowledge/sop-form";
import { cn } from "@/lib/utils";
import type { Sop } from "@/types/entities";

export function SopCard({ sop }: { sop: Sop }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const categoryLabel = sop.category
    ? KNOWLEDGE_CATEGORY_LABELS[
        sop.category as keyof typeof KNOWLEDGE_CATEGORY_LABELS
      ] ?? sop.category
    : null;
  const stepCount = sop.steps?.length ?? 0;

  function close() {
    setOpen(false);
    setEditing(false);
    setError(null);
  }

  function handleDelete() {
    if (!confirm(`SOP "${sop.title}" wirklich loeschen?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteSopAction(sop.id);
      if (result.ok) {
        close();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <Card
        className={cn(
          "cursor-pointer p-4 transition-shadow hover:shadow-md",
        )}
        onClick={() => setOpen(true)}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-neutral-900">
            {sop.title}
          </h3>
          <StatusBadge
            label={SOP_STATUS_LABELS[sop.status as keyof typeof SOP_STATUS_LABELS] ?? sop.status}
            color={sopStatusColor(sop.status)}
          />
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {categoryLabel ? <Badge tone="brand">{categoryLabel}</Badge> : null}
          <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
            <ListChecks className="h-3.5 w-3.5" />
            {stepCount} {stepCount === 1 ? "Schritt" : "Schritte"}
          </span>
        </div>
      </Card>

      <Modal
        open={open}
        onClose={close}
        title={editing ? "SOP bearbeiten" : sop.title}
        size="lg"
      >
        {editing ? (
          <SopForm
            mode="edit"
            id={sop.id}
            initial={{
              title: sop.title,
              category: sop.category,
              status: sop.status,
              steps: sop.steps,
            }}
            onCancel={() => setEditing(false)}
            onDone={() => {
              close();
              router.refresh();
            }}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {categoryLabel ? (
                <Badge tone="brand">{categoryLabel}</Badge>
              ) : null}
              <StatusBadge
                label={SOP_STATUS_LABELS[sop.status as keyof typeof SOP_STATUS_LABELS] ?? sop.status}
                color={sopStatusColor(sop.status)}
              />
            </div>

            {stepCount > 0 ? (
              <ol className="space-y-3">
                {sop.steps.map((step, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold tabular-nums text-brand-700">
                      {index + 1}
                    </span>
                    <div className="space-y-0.5 pt-0.5">
                      <p className="text-sm font-medium text-neutral-900">
                        {step.title}
                      </p>
                      {step.description ? (
                        <p className="whitespace-pre-wrap text-sm text-neutral-600">
                          {step.description}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState
                icon={ListChecks}
                title="Keine Schritte"
                description="Diese SOP enthaelt noch keine Schritte. Bearbeite sie, um welche hinzuzufuegen."
              />
            )}

            {error ? (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {error}
              </p>
            ) : null}

            <div className="flex items-center justify-end gap-2 border-t border-neutral-100 pt-4">
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleDelete}
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
                size="sm"
                onClick={() => setEditing(true)}
                disabled={pending}
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
