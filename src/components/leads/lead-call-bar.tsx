"use client";

import { useState } from "react";
import { Phone } from "lucide-react";
import { CallDialog } from "./call-dialog";
import { outcomeLabel } from "@/lib/lead-workflow";
import { cn } from "@/lib/utils";

const dtf = new Intl.DateTimeFormat("de-CH", { timeZone: "Europe/Zurich", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Kopfleiste im Lead-Detail: letzter Kontakt, Ergebnis, naechster Schritt, Anruf erfassen. */
export function LeadCallBar(props: {
  leadId: string;
  name: string;
  phone: string | null;
  today: string;
  lastCallAt: string | null;
  lastOutcome: string | null;
  lastCaller: string | null;
  attempts: number;
  noAnswers: number;
  nextAction: string | null;
  nextActionDate: string | null;
}) {
  const [open, setOpen] = useState(false);
  const d = props.nextActionDate;
  return (
    <div className="grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Letzter Kontakt</p>
        <p className="text-sm text-neutral-900">
          {props.lastCallAt ? dtf.format(new Date(props.lastCallAt)) : "Noch nie angerufen"}
          {props.lastCaller ? <span className="text-neutral-500"> · {props.lastCaller}</span> : null}
        </p>
      </div>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Letztes Ergebnis</p>
        <p className="text-sm text-neutral-900">
          {outcomeLabel(props.lastOutcome)}
          <span className="text-neutral-500"> · {props.attempts} {props.attempts === 1 ? "Versuch" : "Versuche"}</span>
        </p>
      </div>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Nächster Schritt</p>
        <p className="text-sm">
          {props.nextAction || d ? (
            <>
              <span className="text-neutral-900">{props.nextAction ?? "Geplant"}</span>
              {d ? (
                <span className={cn(" ml-1", d < props.today ? "font-medium text-rose-600" : d === props.today ? "font-medium text-brand-700" : "text-neutral-500")}>
                  · {d === props.today ? "heute" : d.split("-").reverse().join(".")}
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-amber-700">Keiner festgelegt</span>
          )}
        </p>
      </div>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700">
        <Phone className="h-4 w-4" aria-hidden /> Anruf erfassen
      </button>
      <CallDialog lead={open ? { id: props.leadId, name: props.name, phone: props.phone, noAnswers: props.noAnswers } : null} onClose={() => setOpen(false)} />
    </div>
  );
}
