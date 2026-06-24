import Link from "next/link";
import { Sunrise } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { growthEngineService } from "@/server/services";

export const metadata = { title: "Growth - Tagesbriefing" };

export default async function GrowthBriefingPage() {
  const b = await growthEngineService.dailyBriefing().catch(() => null);

  if (!b) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={Sunrise}
              title="Kein Tagesbriefing verfuegbar"
              description="Sobald die Growth Engine Daten gesammelt hat, erscheint hier dein taegliches Briefing."
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-brand-200 bg-brand-50/40">
        <CardContent className="pt-6">
          <p className="text-lg font-medium text-neutral-900">{b.headline}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {b.sections.map((section) => (
          <Card key={section.key}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <span>{section.label}</span>
                <Badge tone="brand">{section.count}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {section.count === 0 ? (
                <p className="text-sm text-neutral-400">Nichts offen</p>
              ) : (
                <>
                  <ul className="space-y-1.5">
                    {section.items.map((item, i) => (
                      <li
                        key={i}
                        className="flex gap-2 text-sm text-neutral-700"
                      >
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-neutral-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={section.href}
                    className="mt-3 inline-block text-xs text-brand-700"
                  >
                    Alle ansehen
                  </Link>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
