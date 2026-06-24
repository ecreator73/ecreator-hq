import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusSelect } from "@/components/production/status-select";
import { TestimonialQuickCreate } from "@/components/growth/testimonial-quick-create";
import { testimonialsService } from "@/server/services";
import type { TestimonialWithClient } from "@/types/entities";
import { TESTIMONIAL_STATUSES, TESTIMONIAL_TYPE_LABELS } from "@/config/catalog";
import { setTestimonialStatusAction } from "@/app/(app)/clients/growth/actions";

export const metadata: Metadata = { title: "Growth - Testimonials" };

function typeLabel(type: string | null): string {
  if (!type) return "-";
  return (
    TESTIMONIAL_TYPE_LABELS[type as keyof typeof TESTIMONIAL_TYPE_LABELS] ?? type
  );
}

export default async function TestimonialsPage() {
  // Rollen-Guard liegt im growth/layout.tsx. Hier nur Daten laden.
  let ts: TestimonialWithClient[] = [];
  try {
    ts = await testimonialsService.list();
  } catch {
    ts = [];
  }

  return (
    <div className="space-y-6">
      {/* Aktionsleiste */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <TestimonialQuickCreate />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Testimonials ({ts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {ts.length === 0 ? (
            <EmptyState
              title="Keine Testimonials"
              description="Sammle Stimmen zufriedener Kunden als Text, Video oder Fallstudie und nutze sie fuer Vertrieb und Marketing."
              action={<TestimonialQuickCreate />}
            />
          ) : (
            <div className="space-y-3">
              {ts.map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {t.client ? (
                          <Link
                            href={`/clients/${t.client.id}`}
                            className="font-medium text-neutral-900 hover:text-brand-700"
                          >
                            {t.client.name}
                          </Link>
                        ) : (
                          <span className="font-medium text-neutral-400">-</span>
                        )}
                        <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                          {typeLabel(t.type)}
                        </span>
                      </div>
                      {t.content ? (
                        <p className="mt-2 line-clamp-2 max-w-2xl text-sm text-neutral-600">
                          {t.content}
                        </p>
                      ) : (
                        <p className="mt-2 text-sm text-neutral-400">
                          Noch kein Inhalt erfasst.
                        </p>
                      )}
                    </div>
                    <div className="shrink-0">
                      <StatusSelect
                        id={t.id}
                        value={t.status}
                        statuses={TESTIMONIAL_STATUSES}
                        action={setTestimonialStatusAction}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
