"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Copy, ExternalLink, Link2, RefreshCw } from "lucide-react";
import { shareLinkAction, type ShareKind } from "@/app/(app)/share-actions";
import { cn } from "@/lib/utils";

/**
 * Oeffentlichen Link erstellen, kopieren, oeffnen, erneuern oder sperren.
 * Es wird nichts versendet: den Link selbst per E-Mail oder WhatsApp teilen.
 */
export function ShareLink({ kind, id, initialPath, label, hint, compact }: { kind: ShareKind; id: string; initialPath: string | null; label: string; hint?: string; compact?: boolean }) {
  const [path, setPath] = useState<string | null>(initialPath);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const url = path ? `${origin}${path}` : null;

  const run = (mode: "create" | "renew" | "revoke") =>
    start(async () => {
      if (mode !== "create" && !window.confirm(mode === "revoke" ? "Link sperren? Er funktioniert danach nicht mehr." : "Neuen Link erstellen? Der bisherige Link funktioniert danach nicht mehr.")) return;
      const r = await shareLinkAction(kind, id, mode);
      if (!r.ok) return setMsg(r.error);
      setPath(r.path);
      setMsg(r.message ?? null);
      if (mode === "create" && r.path) await copy(`${window.location.origin}${r.path}`);
    });
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMsg("Kopieren nicht möglich, bitte Link markieren und kopieren.");
    }
  }

  if (!path)
    return (
      <div className={cn(!compact && "rounded-xl border border-neutral-200 bg-white p-4")}>
        {!compact ? <p className="text-sm font-medium text-neutral-900">{label}</p> : null}
        {!compact && hint ? <p className="mt-0.5 text-xs text-neutral-500">{hint}</p> : null}
        <button type="button" disabled={pending} onClick={() => run("create")} className={cn("inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50", !compact && "mt-3")}>
          <Link2 className="h-4 w-4" aria-hidden /> {compact ? label : "Link erstellen und kopieren"}
        </button>
        {msg ? <p className="mt-1 text-xs text-neutral-600" role="status">{msg}</p> : null}
      </div>
    );

  return (
    <div className={cn("rounded-xl border border-neutral-200 bg-white p-4", compact && "p-3")}>
      <p className="text-sm font-medium text-neutral-900">{label}</p>
      {hint && !compact ? <p className="mt-0.5 text-xs text-neutral-500">{hint}</p> : null}
      <div className="mt-2 flex items-center gap-2">
        <input readOnly value={url ?? ""} aria-label={label} onFocus={(e) => e.currentTarget.select()} className="h-9 min-w-0 flex-1 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 text-xs text-neutral-700" />
        <button type="button" onClick={() => url && copy(url)} aria-label="Link kopieren" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 hover:bg-neutral-50">
          {copied ? <Check className="h-4 w-4 text-emerald-600" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
        </button>
        <a href={path} target="_blank" rel="noopener noreferrer" aria-label="Link öffnen" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 hover:bg-neutral-50">
          <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
        <button type="button" disabled={pending} onClick={() => run("renew")} className="inline-flex items-center gap-1 text-neutral-500 hover:text-neutral-800">
          <RefreshCw className="h-3 w-3" aria-hidden /> Neuer Link
        </button>
        <button type="button" disabled={pending} onClick={() => run("revoke")} className="text-rose-700 hover:underline">
          Sperren
        </button>
        {copied ? <span className="text-emerald-700">kopiert</span> : null}
        {msg ? <span className="text-neutral-600" role="status">{msg}</span> : null}
      </div>
    </div>
  );
}
