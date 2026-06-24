"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import {
  WebsiteProjectForm,
  type WebsiteProjectFormOptions,
} from "@/components/production/website-project-form";
import { productionFormOptionsAction } from "@/app/(app)/production/actions";

/** "+ Website"-Button mit Modal. Optionen werden beim Oeffnen geladen. */
export function WebsiteProjectQuickCreate({
  clientId,
  label = "Website",
}: {
  clientId?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<WebsiteProjectFormOptions | null>(null);
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
        title="Neues Website-Projekt"
        size="lg"
      >
        {options ? (
          <WebsiteProjectForm
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
