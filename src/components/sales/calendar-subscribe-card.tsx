import { CalendarDays, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyField } from "@/components/integrations/copy-field";

/**
 * Anleitung + Adresse, um den CRM-Kalender in Google Kalender (oder Outlook /
 * Apple) zu abonnieren. Der Feed aktualisiert sich automatisch.
 */
export function CalendarSubscribeCard() {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://crm.ecreator.ch";
  const token = process.env.CALENDAR_FEED_TOKEN;
  const url = token
    ? `${base}/api/calendar/ics?token=${token}`
    : `${base}/api/calendar/ics?token=<CALENDAR_FEED_TOKEN>`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-brand-600" />
          Kalender in Google verbinden
        </CardTitle>
        <p className="mt-1 text-sm text-neutral-500">
          Alle Termine, Follow-ups und faelligen Aufgaben erscheinen automatisch
          in deinem Google Kalender - und aktualisieren sich von selbst.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!token ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span>
              Es fehlt noch die Server-Variable <code>CALENDAR_FEED_TOKEN</code>{" "}
              in Vercel (Production). Danach erscheint hier die fertige Adresse.
            </span>
          </div>
        ) : null}

        <CopyField label="Kalender-Adresse (nicht oeffentlich teilen)" value={url} />

        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-600">
          <p className="font-medium text-neutral-800">So verbindest du ihn</p>
          <ol className="mt-1.5 list-decimal space-y-1 pl-5">
            <li>
              Google Kalender oeffnen (calendar.google.com) - am Computer, nicht
              in der App.
            </li>
            <li>
              Links bei <strong>&bdquo;Weitere Kalender&ldquo;</strong> auf{" "}
              <strong>+</strong> klicken &rarr;{" "}
              <strong>&bdquo;Per URL&ldquo;</strong>.
            </li>
            <li>Adresse von oben einfuegen &rarr; <strong>Kalender hinzufuegen</strong>.</li>
            <li>
              Fertig - die CRM-Termine erscheinen im Kalender und werden
              regelmaessig automatisch aktualisiert.
            </li>
          </ol>
          <p className="mt-2 text-xs text-neutral-500">
            Nur Termine gewuenscht? Haenge <code>&amp;scope=meetings</code> an die
            Adresse an. Outlook und Apple Kalender koennen dieselbe Adresse
            abonnieren.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
