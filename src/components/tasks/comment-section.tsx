"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { addCommentAction } from "@/app/(app)/tasks/actions";
import { formatDate } from "@/lib/utils";
import type { TaskComment } from "@/types/entities";

export function CommentSection({
  taskId,
  comments,
}: {
  taskId: string;
  comments: TaskComment[];
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!text.trim()) return;
    startTransition(async () => {
      await addCommentAction(taskId, text.trim());
      setText("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {comments.length === 0 ? (
        <EmptyState
          title="Noch keine Kommentare"
          description="Starte die Team-Kommunikation zu dieser Aufgabe."
        />
      ) : (
        <ul className="space-y-4">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Avatar
                name={c.author?.full_name ?? "?"}
                className="h-8 w-8 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-neutral-900">
                    {c.author?.full_name ?? "Unbekannt"}
                  </span>
                  <span className="text-xs text-neutral-400">
                    {formatDate(c.created_at)}
                  </span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-neutral-700">
                  {c.comment}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-start gap-2 border-t border-neutral-100 pt-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="Kommentar schreiben ..."
          className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        <button
          type="button"
          onClick={submit}
          disabled={pending || !text.trim()}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Senden
        </button>
      </div>
    </div>
  );
}
