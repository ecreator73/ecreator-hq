import * as React from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title = "Keine Daten vorhanden",
  description,
  icon: Icon = Inbox,
  action,
  className,
}: {
  title?: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50/60 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-neutral-400 shadow-sm">
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-sm font-medium text-neutral-700">{title}</p>
      {description ? (
        <p className="mt-1 max-w-md text-sm text-neutral-500">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
