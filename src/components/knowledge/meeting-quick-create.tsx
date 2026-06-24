"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import {
  MeetingForm,
  type MeetingFormOptions,
} from "@/components/knowledge/meeting-form";
import { meetingFormOptionsAction } from "@/app/(app)/operations/actions";

/** "+ Meeting"-Button mit Modal. Optionen (Kunden/Leads) werden beim Oeffnen geladen. */
export function MeetingQuickCreate({ label = "Meeting" }: { label?: string }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<MeetingFormOptions | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (open && !options) {
      meetingFormOptionsAction().then((r) =>
        setOptions(r.ok && r.data ? r.data : { clients: [], leads: [] }),
      );
    }
  }, [open, options]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
      >
        <Plus className="h-4 w-4" />
        {label}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Neues Meeting"
        size="lg"
      >
        {options ? (
          <MeetingForm
            mode="create"
            options={options}
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
