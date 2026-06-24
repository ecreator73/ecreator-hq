"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { ClientForm, type ClientFormInitial } from "@/components/clients/client-form";
import { clientFormOptionsAction } from "@/app/(app)/clients/actions";
import type { ProfileMini } from "@/types/entities";
import { cn } from "@/lib/utils";

/** "+ Kunde"-Button mit Modal. Optionen (Account Manager) werden beim Oeffnen geladen. */
export function ClientQuickCreate({
  initial,
  variant = "primary",
  label = "Kunde",
}: {
  initial?: ClientFormInitial;
  variant?: "primary" | "secondary";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<ProfileMini[] | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (open && !users) {
      clientFormOptionsAction().then((r) =>
        setUsers(r.ok && r.data ? r.data.users : []),
      );
    }
  }, [open, users]);

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

      <Modal open={open} onClose={() => setOpen(false)} title="Neuer Kunde" size="lg">
        {users ? (
          <ClientForm
            mode="create"
            users={users}
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
