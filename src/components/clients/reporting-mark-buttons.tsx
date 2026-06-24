"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, CalendarClock, X, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  markReportingCallStatusAction,
  createTasksFromReportingAction,
} from "@/app/(app)/clients/actions";

type Tone = "green" | "amber" | "red" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  green:
    "border-green-200 bg-green-50 text-green-700 hover:bg-green-100",
  amber:
    "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
  red: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  neutral:
    "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50",
};

/**
 * Markier-Buttons fuer einen Reporting-Call: durchgefuehrt / verschoben /
 * abgesagt setzen den Status; "Aufgaben erstellen" erzeugt Folge-Aufgaben.
 * Jede Aktion laeuft in startTransition und ruft anschliessend router.refresh().
 */
export function ReportingMarkButtons({ callId }: { callId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function mark(statusKey: string) {
    startTransition(async () => {
      await markReportingCallStatusAction(callId, statusKey);
      router.refresh();
    });
  }

  function createTasks() {
    startTransition(async () => {
      await createTasksFromReportingAction(callId);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <MarkButton
        tone="green"
        icon={Check}
        label="Durchgefuehrt"
        disabled={pending}
        onClick={() => mark("completed")}
      />
      <MarkButton
        tone="amber"
        icon={CalendarClock}
        label="Verschoben"
        disabled={pending}
        onClick={() => mark("rescheduled")}
      />
      <MarkButton
        tone="red"
        icon={X}
        label="Abgesagt"
        disabled={pending}
        onClick={() => mark("cancelled")}
      />
      <MarkButton
        tone="neutral"
        icon={ListChecks}
        label="Aufgaben erstellen"
        disabled={pending}
        onClick={createTasks}
      />
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin text-neutral-400" aria-hidden="true" />
      ) : null}
    </div>
  );
}

function MarkButton({
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
