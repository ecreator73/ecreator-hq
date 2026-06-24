"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { MessageEditor } from "@/components/outreach/message-editor";
import { StatusBadge } from "@/components/tasks/status-badge";
import { statusLabel, outreachMessageStatusColor } from "@/config/catalog";
import { formatDate } from "@/lib/utils";
import type { OutreachMessageWithRelations } from "@/types/entities";

/**
 * Kompakte Karte fuer eine Outreach-Nachricht. Zeigt Lead, Betreff (gekuerzt),
 * Status-Badge und Erstellungsdatum. Klick oeffnet den <MessageEditor> zum
 * Bearbeiten, Senden und Setzen des Status.
 */
export function MessageCard({
  message,
}: {
  message: OutreachMessageWithRelations;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full rounded-lg border border-neutral-200 bg-white p-3 text-left shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50/40 focus:outline-none focus:ring-2 focus:ring-brand-100"
      >
        <div className="flex items-start justify-between gap-2">
          <span className="truncate text-xs font-medium text-neutral-500">
            {message.lead?.company_name ?? "Ohne Lead"}
          </span>
          <StatusBadge
            label={statusLabel("outreach_message", message.status)}
            color={outreachMessageStatusColor(message.status)}
          />
        </div>

        <div className="mt-1.5 flex items-start gap-1.5">
          <Mail
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400"
            aria-hidden="true"
          />
          <span className="truncate text-sm font-medium text-neutral-900">
            {message.subject?.trim() ? message.subject : "(Kein Betreff)"}
          </span>
        </div>

        {message.created_at ? (
          <p className="mt-2 text-xs text-neutral-400">
            {formatDate(message.created_at)}
          </p>
        ) : null}
      </button>

      {open ? (
        <MessageEditor
          message={message}
          open={open}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
