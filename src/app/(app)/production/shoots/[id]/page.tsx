import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { teamService } from "@/server/services";
import { productionCrmService } from "@/server/services/production-crm.service";
import { getContext } from "@/server/services/_helpers";
import { ShootDetailView } from "@/components/production/shoot-detail";

export const metadata: Metadata = { title: "Shooting" };

export default async function ShootDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const { supabase } = await getContext();
  const [shoot, users, creators] = await Promise.all([
    productionCrmService.shoot(id).catch(() => null),
    teamService.listMembers().catch(() => []),
    supabase
      .from("creators")
      .select("id, first_name, last_name, city, status")
      .is("deleted_at", null)
      .in("status", ["pool", "active", "qualified"])
      .order("first_name")
      .then((r) => (r.data ?? []) as Array<{ id: string; first_name: string; last_name: string | null; city: string | null; status: string }>),
  ]);
  if (!shoot) notFound();
  return <ShootDetailView shoot={shoot} users={users.map((u) => ({ id: u.id, full_name: u.full_name }))} creators={creators} />;
}
