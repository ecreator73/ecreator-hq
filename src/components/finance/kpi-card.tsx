import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type KpiTone = "neutral" | "brand" | "green" | "amber" | "red";

const TONE_STYLES: Record<KpiTone, string> = {
  neutral: "text-neutral-900",
  brand: "text-brand-700",
  green: "text-green-600",
  amber: "text-amber-600",
  red: "text-red-600",
};

export function KpiCard({
  label,
  value,
  sublabel,
  tone = "neutral",
  href,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  tone?: KpiTone;
  href?: string;
}) {
  const inner = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tabular-nums",
          TONE_STYLES[tone],
        )}
      >
        {value}
      </p>
      {sublabel ? (
        <p className="mt-1 text-xs text-neutral-400">{sublabel}</p>
      ) : null}
    </>
  );

  const base =
    "block rounded-xl border border-neutral-200 bg-white p-5 shadow-sm";

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          base,
          "transition-colors hover:border-brand-300 hover:bg-brand-50/40",
        )}
      >
        {inner}
      </Link>
    );
  }

  return <div className={base}>{inner}</div>;
}
