import { cn } from "@/lib/utils";

/**
 * eCreator-OS-Wortmarke mit kompaktem Logo-Glyph.
 */
export function Brand({
  className,
  collapsed = false,
}: {
  className?: string;
  collapsed?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white shadow-sm"
      >
        eC
      </span>
      {!collapsed ? (
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight text-neutral-900">
            eCreator OS
          </span>
          <span className="text-[11px] font-medium text-neutral-400">
            Internes Betriebssystem
          </span>
        </span>
      ) : null}
    </span>
  );
}
