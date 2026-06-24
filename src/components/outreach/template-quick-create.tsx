"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { TemplateForm } from "@/components/outreach/template-form";
import { cn } from "@/lib/utils";

/** "+ Template"-Button mit Modal (TemplateForm im create-Modus). */
export function TemplateQuickCreate({
  variant = "primary",
  label = "Template",
}: {
  variant?: "primary" | "secondary";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
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

      <Modal open={open} onClose={() => setOpen(false)} title="Neues Template" size="lg">
        <TemplateForm
          mode="create"
          onCancel={() => setOpen(false)}
          onDone={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </Modal>
    </>
  );
}
