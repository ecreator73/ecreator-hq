"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { COMMAND_EVENT } from "@/components/command/global-actions";

/** Header-Button, der die Command-Palette oeffnet (zeigt das passende Shortcut). */
export function CommandTrigger() {
  const [meta, setMeta] = useState("Ctrl");
  useEffect(() => {
    if (typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)) {
      setMeta("⌘");
    }
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(COMMAND_EVENT))}
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-2.5 text-sm text-neutral-500 shadow-sm transition-colors hover:bg-neutral-50 sm:px-3"
      aria-label="Suchen"
    >
      <Search className="h-4 w-4" />
      <span className="hidden sm:inline">Suchen</span>
      <kbd className="hidden items-center rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400 sm:inline-flex">
        {meta} K
      </kbd>
    </button>
  );
}
