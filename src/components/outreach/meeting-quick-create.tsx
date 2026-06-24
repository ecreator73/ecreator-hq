"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { MeetingForm } from "@/components/outreach/meeting-form";
import { outreachFormOptionsAction } from "@/app/(app)/sales/outreach/actions";
import { cn } from "@/lib/utils";

type LeadOption = { id: string; company_name: string };

/** "+ Termin"-Button mit Modal. Leads werden beim Oeffnen geladen. */
export function MeetingQuickCreate({
  variant = "primary",
  label = "Termin",
}: {
  variant?: "primary" | "secondary";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [leads, setLeads] = useState<LeadOption[] | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (open && !leads) {
      outreachFormOptionsAction().then((r) =>
        setLeads(r.ok && r.data ? r.data.leads : []),
      );
    }
  }, [open, leads]);

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
        title="Neuer Termin"
        size="lg"
      >
        {leads ? (
          <MeetingForm
            options={{ leads }}
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
