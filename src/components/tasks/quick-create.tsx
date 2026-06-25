"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { TaskForm, type TaskFormInitial } from "@/components/tasks/task-form";
import {
  taskFormOptionsAction,
  type TaskFormOptions,
} from "@/app/(app)/tasks/actions";
import { cn } from "@/lib/utils";

/**
 * Globaler "+ Aufgabe"-Button. Ueberall verfuegbar; optional mit Kontext
 * (z.B. client_id/project_id vorbelegt). Optionen werden beim Oeffnen geladen.
 */
export function QuickCreate({
  initial,
  variant = "primary",
  label = "Aufgabe",
  open: openProp,
  onOpenChange,
  hideTrigger = false,
}: {
  initial?: TaskFormInitial;
  variant?: "primary" | "secondary";
  label?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = (o: boolean) =>
    onOpenChange ? onOpenChange(o) : setInternalOpen(o);
  const [options, setOptions] = useState<TaskFormOptions | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (open && !options) {
      taskFormOptionsAction().then((r) => {
        setOptions(
          r.ok && r.data ? r.data : { clients: [], projects: [], users: [] },
        );
      });
    }
  }, [open, options]);

  return (
    <>
      {hideTrigger ? null : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium shadow-sm transition-colors",
            variant === "primary"
              ? "bg-brand-600 text-white hover:bg-brand-700"
              : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50",
          )}
        >
          <Plus className="h-4 w-4" />
          {label}
        </button>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Neue Aufgabe"
        size="lg"
      >
        {options ? (
          <TaskForm
            mode="create"
            options={options}
            initial={initial}
            onCancel={() => setOpen(false)}
            onDone={() => {
              setOpen(false);
              router.refresh();
            }}
          />
        ) : (
          <div className="flex items-center justify-center py-10 text-neutral-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
      </Modal>
    </>
  );
}
