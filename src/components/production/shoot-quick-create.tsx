"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { ShootForm } from "@/components/production/shoot-form";
import { productionFormOptionsAction } from "@/app/(app)/production/actions";
import { cn } from "@/lib/utils";

type Options = {
  clients: { id: string; name: string }[];
  contentProjects: { id: string; title: string }[];
};

/** "+ Shooting"-Button mit Modal. Optionen werden beim Oeffnen geladen. */
export function ShootQuickCreate({
  clientId,
  label = "Shooting",
  variant = "primary",
}: {
  clientId?: string;
  label?: string;
  variant?: "primary" | "secondary";
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<Options | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (open && !options) {
      productionFormOptionsAction().then((r) =>
        setOptions(
          r.ok && r.data
            ? { clients: r.data.clients, contentProjects: r.data.contentProjects }
            : { clients: [], contentProjects: [] },
        ),
      );
    }
  }, [open, options]);

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

      <Modal open={open} onClose={() => setOpen(false)} title="Neues Shooting" size="lg">
        {options ? (
          <ShootForm
            mode="create"
            options={options}
            clientId={clientId}
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
