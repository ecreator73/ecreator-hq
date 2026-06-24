"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { deleteChurnAction } from "@/app/(app)/clients/growth/actions";

/** Kleiner "Entfernen"-Button, der ein Churn-Risiko entfernt und die Ansicht aktualisiert. */
export function ChurnDismiss({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onDismiss() {
    startTransition(async () => {
      await deleteChurnAction(id);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onDismiss}
      disabled={pending}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      Entfernen
    </button>
  );
}
