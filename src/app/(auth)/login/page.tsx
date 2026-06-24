import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Info } from "lucide-react";
import { Brand } from "@/components/brand";
import { getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Anmelden",
};

export default async function LoginPage() {
  // Bereits eingeloggt? -> direkt ins Dashboard.
  const user = await getSessionUser();
  if (user) redirect("/");

  const configured = isSupabaseConfigured();

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <Brand />
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-semibold tracking-tight text-neutral-900">
            Anmelden
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Internes Betriebssystem der eCreator GmbH
          </p>
        </div>

        {!configured ? (
          <div className="mb-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Supabase ist noch nicht konfiguriert. Lege{" "}
              <code className="rounded bg-amber-100 px-1 py-0.5 text-[12px]">
                .env.local
              </code>{" "}
              an, um die Anmeldung zu aktivieren.
            </span>
          </div>
        ) : null}

        <LoginForm disabled={!configured} />
      </div>

      <p className="text-center text-xs text-neutral-400">
        Zugang nur fuer Mitarbeitende der eCreator GmbH.
      </p>
    </div>
  );
}
