"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { ContentProjectForm } from "@/components/production/content-project-form";
import { productionFormOptionsAction } from "@/app/(app)/production/actions";
import type { ProfileMini, ClientMini } from "@/types/entities";
import { cn } from "@/lib/utils";

interface ProjectMiniOption {
  id: string;
  title: string;
}

type Options = {
  users: ProfileMini[];
  clients: ClientMini[];
  projects: ProjectMiniOption[];
};

/** "+ Content"-Button mit Modal. Optionen werden beim Oeffnen geladen. */
export function ContentProjectQuickCreate({
  clientId,
  variant = "primary",
  label = "Content",
}: {
  clientId?: string;
  variant?: "primary" | "secondary";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<Options | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (open && !options) {
      productionFormOptionsAction().then((r) =>
        setOptions(
          r.ok && r.data
            ? { users: r.data.users, clients: r.data.clients, projects: r.data.projects }
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

      <Modal open={open} onClose={() => setOpen(false)} title="Neues Content-Projekt" size="lg">
        {options ? (
          <ContentProjectForm
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
