"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { MeetingForm, type MeetingFormInitial } from "@/components/sales/meeting-form";
import {
  salesFormOptionsAction,
  type SalesFormOptions,
} from "@/app/(app)/sales/actions";

/**
 * "+ Termin"-Button mit Modal. Optionen (Leads etc.) werden beim Oeffnen geladen.
 */
export function MeetingQuickCreate({
  initial,
  label = "Termin",
}: {
  initial?: MeetingFormInitial;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<SalesFormOptions | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (open && !options) {
      salesFormOptionsAction().then((r) => {
        setOptions(
          r.ok && r.data ? r.data : { clients: [], users: [], leads: [] },
        );
      });
    }
  }, [open, options]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
      >
        <CalendarPlus className="h-4 w-4" />
        {label}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Neuer Termin"
        size="lg"
      >
        {options ? (
          <MeetingForm
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
