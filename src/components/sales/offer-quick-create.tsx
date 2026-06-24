"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import {
  OfferForm,
  type OfferFormInitial,
  type OfferFormOptions,
} from "@/components/sales/offer-form";
import { salesFormOptionsAction } from "@/app/(app)/sales/actions";
import { cn } from "@/lib/utils";

/** "+ Angebot"-Button mit Modal. Optionen (Kunden/Leads/Users) werden beim Oeffnen geladen. */
export function OfferQuickCreate({
  initial,
  variant = "primary",
  label = "Angebot",
}: {
  initial?: OfferFormInitial;
  variant?: "primary" | "secondary";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<OfferFormOptions | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (open && !options) {
      salesFormOptionsAction().then((r) =>
        setOptions(
          r.ok && r.data
            ? r.data
            : { clients: [], users: [], leads: [] },
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

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Neues Angebot"
        size="lg"
      >
        {options ? (
          <OfferForm
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
