"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZE_MAP = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
} as const;

/** Groesse entweder als Variante ("sm"|"md"|"lg") oder als Pixelwert (number). */
type Size = keyof typeof SIZE_MAP | number;

/** Liefert {className?, style?} fuer eine Stern-Groesse. */
function sizeProps(size: Size): {
  className?: string;
  style?: React.CSSProperties;
} {
  if (typeof size === "number") {
    return { style: { height: size, width: size } };
  }
  return { className: SIZE_MAP[size] };
}

/**
 * Reine Anzeige einer 1-5-Bewertung. `value` null -> "—".
 * Gefuellte Sterne bis Math.round(value), Rest leer.
 */
export function StarRating({
  value,
  size = "md",
}: {
  value: number | null;
  size?: Size;
}) {
  if (value == null) {
    return <span className="text-sm text-neutral-400">—</span>;
  }
  const filled = Math.round(value);
  const sp = sizeProps(size);
  return (
    <span
      className="inline-flex items-center gap-0.5"
      title={`${value.toFixed(1)} von 5`}
      aria-label={`Bewertung ${value.toFixed(1)} von 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          style={sp.style}
          className={cn(
            sp.className,
            n <= filled
              ? "fill-amber-400 text-amber-400"
              : "fill-none text-neutral-300",
          )}
        />
      ))}
    </span>
  );
}

/**
 * Klickbare 1-5-Sterne-Auswahl. Hover-Vorschau, Klick ruft onChange(n).
 */
export function StarInput({
  value,
  onChange,
  size = "md",
}: {
  value: number;
  onChange: (n: number) => void;
  size?: Size;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const sp = sizeProps(size);
  const shown = hover ?? value;
  return (
    <span className="inline-flex items-center gap-0.5" onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          aria-label={`${n} Sterne`}
          aria-pressed={value === n}
          className="rounded p-0.5 text-neutral-300 transition-colors hover:text-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-100"
        >
          <Star
            aria-hidden="true"
            style={sp.style}
            className={cn(
              sp.className,
              n <= shown
                ? "fill-amber-400 text-amber-400"
                : "fill-none text-neutral-300",
            )}
          />
        </button>
      ))}
    </span>
  );
}
