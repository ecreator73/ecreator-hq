import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ImportTabs } from "@/components/import/import-tabs";
import { requireUser } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";

export const metadata: Metadata = { title: "Import" };

export default async function ImportPage() {
  const user = await requireUser();
  const canFinance = canAccess(user.roles, ["super_admin", "ceo", "finance"]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Daten importieren</CardTitle>
          <CardDescription>
            CSV aus Excel importieren - automatische Spaltenzuordnung,
            Validierung, Dubletten-Erkennung. Kein Versand, nichts wird
            ueberschrieben ausser gewollt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImportTabs canFinance={canFinance} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>So funktioniert der Import</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-neutral-600">
            <li className="flex gap-2">
              <span className="text-brand-600">1.</span>
              <span>
                Der Kunden-Import legt Kunde + aktiven Vertrag (MRR) an.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand-600">2.</span>
              <span>
                Der Verträge-Import braucht bestehende Kunden (Match per Name).
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand-600">3.</span>
              <span>Der Finance-Import legt Rechnungen an.</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
