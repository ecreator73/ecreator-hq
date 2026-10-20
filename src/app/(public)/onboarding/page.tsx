import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicPage } from "@/components/public/public-frame";
import { OnboardingForm } from "@/components/public/onboarding-form";

export const metadata: Metadata = { title: { absolute: "Kunden-Onboarding · eCreator" } };
export const dynamic = "force-dynamic";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ k?: string }> }) {
  const { k } = await searchParams;
  let company: string | null = null;
  let token: string | null = null;
  if (k && /^[\w-]{20,100}$/.test(k)) {
    const { data } = await createAdminClient().from("clients").select("name").eq("onboarding_token", k).maybeSingle();
    if (data) {
      company = data.name;
      token = k;
    }
  }
  return (
    <PublicPage badge="Onboarding">
      <h1 className="text-3xl font-bold tracking-tight">{company ? `Willkommen, ${company}` : "Willkommen bei eCreator"}</h1>
      <p className="mt-2 text-neutral-600">Kunden-Onboarding. Deine Angaben werden auf diesem Gerät zwischengespeichert, du kannst jederzeit später weitermachen.</p>
      <div className="mt-8">
        <OnboardingForm token={token} company={company} />
      </div>
    </PublicPage>
  );
}
