import type { Metadata } from "next";
import { GoalProgress } from "@/components/executive/goal-progress";
import { GoalQuickCreate } from "@/components/executive/goal-quick-create";
import { EmptyState } from "@/components/ui/empty-state";
import { companyGoalsService } from "@/server/services";
import type { CompanyGoal } from "@/types/entities";

export const metadata: Metadata = { title: "Executive - Ziele" };

export default async function ExecutiveGoalsPage() {
  // Rollen-Guard liegt im executive/layout.tsx (requireRole). Hier nur Daten laden.
  const goals = await companyGoalsService.list().catch((): CompanyGoal[] => []);

  return (
    <div className="space-y-6">
      {/* Aktionsleiste */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <GoalQuickCreate />
      </div>

      {goals.length === 0 ? (
        <EmptyState
          title="Noch keine Firmenziele"
          description="Definieren Sie messbare Ziele - z.B. CHF 50'000 MRR, 100 Kunden, 300 Creator oder 1'000 Leads - und verfolgen Sie den Fortschritt an einem Ort."
          action={<GoalQuickCreate />}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => (
            <GoalProgress key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </div>
  );
}
