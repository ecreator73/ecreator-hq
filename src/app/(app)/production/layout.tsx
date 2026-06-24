import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { ProductionNav } from "@/components/production/production-nav";

export default async function ProductionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Production"
        title="Production Hub"
        description="Steuerung aller Kundenprojekte: Websites, Ads, CRM, Content, Drehs und Assets."
      />
      <ProductionNav />
      <div>{children}</div>
    </div>
  );
}
