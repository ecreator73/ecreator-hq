"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Send,
  Trash2,
  MailOpen,
  Reply,
  ThumbsUp,
  ThumbsDown,
  Ban,
  Info,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/tasks/status-badge";
import {
  statusLabel,
  outreachMessageStatusColor,
} from "@/config/catalog";
import {
  updateMessageAction,
  sendMessageAction,
  setMessageStatusAction,
  deleteMessageAction,
} from "@/app/(app)/sales/outreach/actions";
import type { OutreachMessageWithRelations } from "@/types/entities";
import { cn } from "@/lib/utils";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

type Tone = "amber" | "green" | "red" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  amber: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
  green: "border-green-200 bg-green-50 text-green-700 hover:bg-green-100",
  red: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  neutral: "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50",
};

const STATUS_BUTTONS: {
  status: string;
  label: string;
  tone: Tone;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { status: "opened", label: "Geoeffnet", tone: "amber", icon: MailOpen },
  { status: "replied", label: "Beantwortet", tone: "amber", icon: Reply },
  { status: "positive", label: "Positiv", tone: "green", icon: ThumbsUp },
  { status: "negative", label: "Negativ", tone: "red", icon: ThumbsDown },
  { status: "no_interest", label: "Kein Interesse", tone: "neutral", icon: Ban },
];

/**
 * Modal zum Bearbeiten eines Outreach-Entwurfs: Betreff + Text editierbar
 * (-> updateMessageAction), Senden (-> sendMessageAction, tatsaechliche
 * Zustellung erfordert verbundene Gmail/Resend-Integration), Status-Buttons
 * (-> setMessageStatusAction) und Loeschen (-> deleteMessageAction).
 */
export function MessageEditor({
  message,
  open,
  onClose,
}: {
  message: OutreachMessageWithRelations;
  open: boolean;
  onClose: () => void;
}) {
  const [subject, setSubject] = useState(message.subject ?? "");
  const [body, setBody] = useState(message.body ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const dirty = subject !== (message.subject ?? "") || body !== (message.body ?? "");

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateMessageAction(message.id, {
        subject: subject.trim() || undefined,
        body: body.trim() || undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function send() {
    setError(null);
    startTransition(async () => {
      if (dirty) {
        const upd = await updateMessageAction(message.id, {
          subject: subject.trim() || undefined,
          body: body.trim() || undefined,
        });
        if (!upd.ok) {
          setError(upd.error);
          return;
        }
      }
      const res = await sendMessageAction(message.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  function setStatus(status: string) {
    setError(null);
    startTransition(async () => {
      const res = await setMessageStatusAction(message.id, status);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const res = await deleteMessageAction(message.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="E-Mail bearbeiten" size="lg">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-neutral-900">
              {message.lead?.company_name ?? "Ohne Lead"}
            </p>
            {message.campaign ? (
              <p className="truncate text-xs text-neutral-500">{message.campaign.name}</p>
            ) : null}
          </div>
          <StatusBadge
            label={statusLabel("outreach_message", message.status)}
            color={outreachMessageStatusColor(message.status)}
          />
        </div>

        <div>
          <label
            htmlFor={`subject-${message.id}`}
            className="mb-1 block text-xs font-medium text-neutral-600"
          >
            Betreff
          </label>
          <input
            id={`subject-${message.id}`}
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={pending}
            className={inputClass}
            placeholder="Betreffzeile"
          />
        </div>

        <div>
          <label
            htmlFor={`body-${message.id}`}
            className="mb-1 block text-xs font-medium text-neutral-600"
          >
            Text
          </label>
          <textarea
            id={`body-${message.id}`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={pending}
            rows={12}
            className={cn(inputClass, "resize-y font-mono leading-relaxed")}
            placeholder="Nachrichtentext"
          />
        </div>

        <p className="flex items-start gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Tatsaechliche Zustellung erfordert eine verbundene Gmail-/Resend-Integration.
          Entwurf vor Versand pruefen — Opt-out-Adressen werden serverseitig blockiert.
        </p>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        ) : null}

        <div className="border-t border-neutral-100 pt-3">
          <p className="mb-1.5 text-xs font-medium text-neutral-600">Status markieren</p>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_BUTTONS.map((b) => {
              const Icon = b.icon;
              const isCurrent = message.status === b.status;
              return (
                <button
                  key={b.status}
                  type="button"
                  onClick={() => setStatus(b.status)}
                  disabled={pending || isCurrent}
                  aria-pressed={isCurrent}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                    TONE_CLASS[b.tone],
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {b.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-3">
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-sm font-medium text-red-600 shadow-sm transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Loeschen
          </button>
          <div className="flex items-center gap-2">
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin text-neutral-400" aria-hidden="true" />
            ) : null}
            <button
              type="button"
              onClick={save}
              disabled={pending || !dirty}
              className="inline-flex h-9 items-center rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Speichern
            </button>
            <button
              type="button"
              onClick={send}
              disabled={pending}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              Senden
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
