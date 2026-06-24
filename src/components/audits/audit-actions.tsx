"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, Loader2, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import {
  deleteAuditAction,
  generateAuditAction,
} from "@/app/(app)/sales/audits/actions";
import { cn } from "@/lib/utils";

const linkClass =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50";

/**
 * Aktionsleiste fuer ein Audit-Detail: Neu generieren, Loeschen,
 * Links auf den druckbaren Report und die Sales-Version.
 */
export function AuditActions({ auditId }: { auditId: string }) {
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function regenerate() {
    setError(null);
    setGenerating(true);
    const res = await generateAuditAction(auditId);
    if (res.ok) {
      router.refresh();
      setGenerating(false);
    } else {
      setError(res.error);
      setGenerating(false);
    }
  }

  async function remove() {
    if (!window.confirm("Dieses Audit wirklich loeschen?")) return;
    setError(null);
    setDeleting(true);
    const res = await deleteAuditAction(auditId);
    if (res.ok) {
      router.push("/sales/audits/list");
    } else {
      setError(res.error);
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link
          href={`/sales/audits/${auditId}/report`}
          className={linkClass}
        >
          <FileText className="h-4 w-4" />
          Report (PDF)
        </Link>
        <Link
          href={`/sales/audits/${auditId}/sales`}
          className={linkClass}
        >
          <Sparkles className="h-4 w-4" />
          Sales-Version
        </Link>
        <button
          type="button"
          onClick={regenerate}
          disabled={generating || deleting}
          className={cn(
            linkClass,
            "disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Neu generieren
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={generating || deleting}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-sm font-medium text-red-700 shadow-sm transition-colors hover:bg-red-50",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          {deleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Loeschen
        </button>
      </div>
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
