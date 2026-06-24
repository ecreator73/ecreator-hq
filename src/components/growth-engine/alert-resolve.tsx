"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveGrowthAlertAction } from "@/app/(app)/operations/growth/actions";

/** Markiert einen Growth-Alert als erledigt. */
export function AlertResolveButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onResolve() {
    startTransition(async () => {
      await resolveGrowthAlertAction(id);
      router.refresh();
    });
  }

  return (
    <Button variant="ghost" size="sm" onClick={onResolve} disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Check className="h-4 w-4" aria-hidden="true" />
      )}
      Erledigt
    </Button>
  );
}
