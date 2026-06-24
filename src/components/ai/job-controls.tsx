"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pause, Play, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  setJobStatusAction,
  runJobAction,
  deleteJobAction,
} from "@/app/(app)/settings/ai/actions";
import type { AutomationJob } from "@/types/entities";

type Tone = "green" | "amber" | "neutral" | "red";

const TONE_CLASS: Record<Tone, string> = {
  green: "border-green-200 bg-green-50 text-green-700 hover:bg-green-100",
  amber: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
  neutral: "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50",
  red: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
};

/**
 * Steuer-Buttons fuer einen Automation-Job. Aktiv -> Pausieren, sonst
 * Aktivieren; "Jetzt ausfuehren" loest einen Lauf aus (mit kurzem Lade-/
 * Erfolgszustand); Loeschen entfernt den Job. Jede Aktion ruft router.refresh().
 */
export function JobControls({ job }: { job: AutomationJob }) {
  const [pending, startTransition] = useTransition();
  const [ranOk, setRanOk] = useState(false);
  const router = useRouter();
  const isActive = job.status === "active";

  function setStatus(status: string) {
    startTransition(async () => {
      await setJobStatusAction(job.id, status);
      router.refresh();
    });
  }

  function run() {
    setRanOk(false);
    startTransition(async () => {
      const result = await runJobAction(job.id);
      if (result.ok) {
        setRanOk(true);
        setTimeout(() => setRanOk(false), 2500);
      }
      router.refresh();
    });
  }

  function remove() {
    if (!window.confirm("Diesen Job wirklich loeschen?")) return;
    startTransition(async () => {
      await deleteJobAction(job.id);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {isActive ? (
        <ControlButton
          tone="amber"
          icon={Pause}
          label="Pausieren"
          disabled={pending}
          onClick={() => setStatus("paused")}
        />
      ) : (
        <ControlButton
          tone="green"
          icon={Play}
          label="Aktivieren"
          disabled={pending}
          onClick={() => setStatus("active")}
        />
      )}

      <ControlButton
        tone="neutral"
        icon={ranOk ? Check : pending ? Loader2 : Play}
        iconClassName={pending && !ranOk ? "animate-spin" : undefined}
        label={ranOk ? "Ausgefuehrt" : "Jetzt ausfuehren"}
        disabled={pending}
        onClick={run}
      />

      <ControlButton
        tone="red"
        icon={Trash2}
        label="Loeschen"
        disabled={pending}
        onClick={remove}
      />
    </div>
  );
}

function ControlButton({
  tone,
  icon: Icon,
  iconClassName,
  label,
  disabled,
  onClick,
}: {
  tone: Tone;
  icon: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
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
      <Icon className={cn("h-3.5 w-3.5", iconClassName)} aria-hidden="true" />
      {label}
    </button>
  );
}
