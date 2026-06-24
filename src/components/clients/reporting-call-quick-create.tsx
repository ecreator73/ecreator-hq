"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import {
  ReportingCallForm,
  type ReportingCallFormInitial,
} from "@/components/clients/reporting-call-form";
import { clientFormOptionsAction } from "@/app/(app)/clients/actions";
import type { ProfileMini } from "@/types/entities";
import { cn } from "@/lib/utils";

/**
 * "+ Reporting-Call"-Button mit Modal. Optionen (Verantwortliche) werden beim
 * Oeffnen geladen. Optional kann ein fester Kunde uebergeben werden; sonst
 * stehen die uebergebenen `clients` zur Auswahl.
 */
export function ReportingCallQuickCreate({
  clients,
  clientId,
  variant = "primary",
  label = "Reporting-Call",
}: {
  clients?: { id: string; name: string }[];
  clientId?: string;
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

  const initial: ReportingCallFormInitial | undefined = clientId
    ? { client_id: clientId }
    : undefined;

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

      <Modal open={open} onClose={() => setOpen(false)} title="Neuer Reporting-Call" size="lg">
        {users ? (
          <ReportingCallForm
            mode="create"
            users={users}
            clients={clients}
            clientId={clientId}
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
