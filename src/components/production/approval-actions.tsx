"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, Check, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createApprovalAction,
  setApprovalStatusAction,
  deleteApprovalAction,
} from "@/app/(app)/production/actions";
import type { ApprovalCreateInput } from "@/lib/validation/production";

/**
 * Kleiner Button "Freigabe anfordern" fuer ein Asset. Erzeugt eine offene
 * Freigabe und ruft anschliessend router.refresh().
 */
export function RequestApprovalButton({
  assetId,
  clientId,
}: {
  assetId: string;
  clientId?: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function request() {
    startTransition(async () => {
      const input: ApprovalCreateInput = {
        asset_id: assetId,
        client_id: clientId || undefined,
        title: "Freigabe",
        status: "open",
      };
      await createApprovalAction(input);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={request}
      disabled={pending}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 text-xs font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      Freigabe anfordern
    </button>
  );
}

type Tone = "green" | "red" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  green: "border-green-200 bg-green-50 text-green-700 hover:bg-green-100",
  red: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  neutral: "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50",
};

/**
 * Entscheidungs-Buttons fuer eine Freigabe: Freigeben / Ablehnen setzen den
 * Status, Loeschen entfernt die Freigabe. Jede Aktion ruft router.refresh().
 */
export function ApprovalDecisionButtons({ approvalId }: { approvalId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function setStatus(statusKey: string) {
    startTransition(async () => {
      await setApprovalStatusAction(approvalId, statusKey);
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      await deleteApprovalAction(approvalId);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <DecisionButton
        tone="green"
        icon={Check}
        label="Freigeben"
        disabled={pending}
        onClick={() => setStatus("approved")}
      />
      <DecisionButton
        tone="red"
        icon={X}
        label="Ablehnen"
        disabled={pending}
        onClick={() => setStatus("rejected")}
      />
      <DecisionButton
        tone="neutral"
        icon={Trash2}
        label="Loeschen"
        disabled={pending}
        onClick={remove}
      />
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin text-neutral-400" aria-hidden="true" />
      ) : null}
    </div>
  );
}

function DecisionButton({
  tone,
  icon: Icon,
  label,
  disabled,
  onClick,
}: {
  tone: Tone;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        TONE_CLASS[tone],
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}
