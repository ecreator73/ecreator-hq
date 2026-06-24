"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { TestimonialForm } from "@/components/growth/testimonial-form";
import { growthFormOptionsAction } from "@/app/(app)/clients/growth/actions";

/** "+ Testimonial"-Button mit Modal. Kunden-Optionen werden beim Oeffnen geladen. */
export function TestimonialQuickCreate({
  label = "Testimonial",
}: {
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<{ id: string; name: string }[] | null>(
    null,
  );
  const router = useRouter();

  useEffect(() => {
    if (open && !clients) {
      growthFormOptionsAction().then((r) =>
        setClients(r.ok && r.data ? r.data.clients : []),
      );
    }
  }, [open, clients]);

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
        title="Neues Testimonial"
        size="lg"
      >
        {clients ? (
          <TestimonialForm
            mode="create"
            options={{ clients }}
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
