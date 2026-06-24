"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import {
  AdProjectForm,
  type AdProjectFormOptions,
} from "@/components/production/ad-project-form";
import { productionFormOptionsAction } from "@/app/(app)/production/actions";

/** "+ Ads-Kampagne"-Button mit Modal. Optionen werden beim Oeffnen geladen. */
export function AdProjectQuickCreate({
  clientId,
  label = "Ads-Kampagne",
}: {
  clientId?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<AdProjectFormOptions | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (open && !options) {
      productionFormOptionsAction().then((r) =>
        setOptions(
          r.ok && r.data
            ? {
                users: r.data.users,
                clients: r.data.clients,
                projects: r.data.projects,
              }
            : { users: [], clients: [], projects: [] },
        ),
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
        title="Neue Ads-Kampagne"
        size="lg"
      >
        {options ? (
          <AdProjectForm
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
