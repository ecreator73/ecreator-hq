import type { Metadata } from "next";
import { ShieldOff } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { UnsubscribeForm } from "@/components/outreach/unsubscribe-form";
import { unsubscribesService } from "@/server/services";
import type { Unsubscribe } from "@/types/entities";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Outreach - Opt-out" };

export default async function OptOutPage() {
  const list: Unsubscribe[] = await unsubscribesService.list().catch(() => []);

  return (
    <div className="space-y-6">
      {/* Hinweis-Banner */}
      <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <ShieldOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          Diese Adressen werden nie wieder kontaktiert. Der Outreach-Versand
          ueberspringt sie automatisch.
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        {/* Abmeldung hinzufuegen */}
        <Card>
          <CardHeader>
            <CardTitle>Abmeldung hinzufuegen</CardTitle>
          </CardHeader>
          <CardContent>
            <UnsubscribeForm />
          </CardContent>
        </Card>

        {/* Opt-out-Liste */}
        <Card>
          <CardHeader>
            <CardTitle>Opt-out-Liste ({list.length})</CardTitle>
          </CardHeader>
          <CardContent className={list.length === 0 ? undefined : "p-0"}>
            {list.length === 0 ? (
              <EmptyState
                title="Keine Abmeldungen"
                description="Es sind aktuell keine Adressen eingetragen. Eingetragene Adressen werden vom Versand dauerhaft ausgeschlossen."
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-neutral-200">
                <table className="w-full min-w-[36rem] text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                      <th className="px-4 py-2.5 font-medium">E-Mail</th>
                      <th className="px-4 py-2.5 font-medium">Grund</th>
                      <th className="px-4 py-2.5 font-medium">Abgemeldet am</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {list.map((u) => (
                      <tr key={u.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-2.5 font-medium text-neutral-900">
                          {u.email}
                        </td>
                        <td className="px-4 py-2.5 text-neutral-600">
                          {u.reason || (
                            <span className="text-neutral-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums text-neutral-700">
                          {u.unsubscribed_at
                            ? formatDate(u.unsubscribed_at)
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
