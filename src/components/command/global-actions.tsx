"use client";

import { useEffect, useState } from "react";
import { CommandPalette, type CreateKind } from "@/components/command/command-palette";
import { QuickCreate } from "@/components/tasks/quick-create";
import { LeadQuickCreate } from "@/components/sales/lead-quick-create";
import { ClientQuickCreate } from "@/components/clients/client-quick-create";

/** Event, das der Header-Such-Button feuert, um die Palette zu oeffnen. */
export const COMMAND_EVENT = "ecreator:command";

function isTyping(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    node.isContentEditable
  );
}

/**
 * Globale Aktionen: Command-Palette (Cmd/Ctrl+K) + Tastatur-Schnellaktionen
 * (L=Lead, C=Kunde, Q=Aufgabe, wenn nicht in einem Eingabefeld). Reused die
 * bestehenden Quick-Create-Dialoge im gesteuerten Modus (kein Seitenwechsel).
 */
export function GlobalActions() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [createKind, setCreateKind] = useState<CreateKind | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      // Cmd/Ctrl+K -> Palette toggeln (auch waehrend des Tippens)
      if ((e.metaKey || e.ctrlKey) && k === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e.target) || paletteOpen || createKind) return;
      if (k === "l") {
        e.preventDefault();
        setCreateKind("lead");
      } else if (k === "c") {
        e.preventDefault();
        setCreateKind("client");
      } else if (k === "q") {
        e.preventDefault();
        setCreateKind("task");
      }
    }
    function onOpen() {
      setPaletteOpen(true);
    }
    document.addEventListener("keydown", onKey);
    window.addEventListener(COMMAND_EVENT, onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener(COMMAND_EVENT, onOpen);
    };
  }, [paletteOpen, createKind]);

  const closeCreate = (o: boolean) => {
    if (!o) setCreateKind(null);
  };

  return (
    <>
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onCreate={(k) => setCreateKind(k)}
      />
      <QuickCreate hideTrigger open={createKind === "task"} onOpenChange={closeCreate} />
      <LeadQuickCreate hideTrigger open={createKind === "lead"} onOpenChange={closeCreate} />
      <ClientQuickCreate hideTrigger open={createKind === "client"} onOpenChange={closeCreate} />
    </>
  );
}
