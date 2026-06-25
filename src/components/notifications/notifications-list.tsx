"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, CheckCheck, Loader2 } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import type { Notification } from "@/types/entities";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/app/(app)/notifications/actions";

function hrefFor(n: Notification): string | null {
  if (!n.entity_id) return null;
  switch (n.entity_type) {
    case "task":
      return `/tasks/${n.entity_id}`;
    case "client":
      return `/clients/${n.entity_id}`;
    case "lead":
      return `/sales/leads/${n.entity_id}`;
    default:
      return null;
  }
}

export function NotificationsList({ items }: { items: Notification[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const unread = items.filter((n) => !n.is_read).length;

  function markOne(id: string) {
    start(async () => {
      await markNotificationReadAction(id);
      router.refresh();
    });
  }
  function markAll() {
    start(async () => {
      await markAllNotificationsReadAction();
      router.refresh();
    });
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Keine Benachrichtigungen"
        description="Du bist auf dem Laufenden - hier erscheinen neue Hinweise zu Aufgaben, Kunden und Terminen."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          {unread > 0 ? `${unread} ungelesen` : "Alles gelesen"}
        </p>
        {unread > 0 ? (
          <button
            type="button"
            onClick={markAll}
            disabled={pending}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
            Alle als gelesen
          </button>
        ) : null}
      </div>

      <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
        {items.map((n) => {
          const href = hrefFor(n);
          const Title = (
            <p className={cn("text-sm", n.is_read ? "text-neutral-700" : "font-semibold text-neutral-900")}>
              {n.title}
            </p>
          );
          return (
            <li key={n.id} className={cn("flex items-start gap-3 px-4 py-3", !n.is_read && "bg-brand-50/40")}>
              <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.is_read ? "bg-neutral-200" : "bg-brand-500")} />
              <div className="min-w-0 flex-1">
                {href ? <Link href={href} className="hover:text-brand-700">{Title}</Link> : Title}
                {n.body ? <p className="mt-0.5 text-sm text-neutral-500">{n.body}</p> : null}
                <p className="mt-1 text-xs text-neutral-400">{formatDate(n.created_at)}</p>
              </div>
              {!n.is_read ? (
                <button
                  type="button"
                  onClick={() => markOne(n.id)}
                  disabled={pending}
                  title="Als gelesen markieren"
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
