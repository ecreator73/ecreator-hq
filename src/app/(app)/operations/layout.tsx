import { requireUser } from "@/lib/auth";
import { OperationsHeader } from "@/components/knowledge/operations-header";
import { OperationsNav } from "@/components/knowledge/operations-nav";

export default async function OperationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="space-y-6">
      <OperationsHeader />
      <OperationsNav userRoles={user.roles} />
      <div>{children}</div>
    </div>
  );
}
