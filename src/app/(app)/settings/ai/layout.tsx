import { requireRole } from "@/lib/auth";
import { SETTINGS_AI_ROLES } from "@/config/navigation";
import { AiNav } from "@/components/ai/ai-nav";

export default async function SettingsAiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(SETTINGS_AI_ROLES);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
          AI & Automation
        </p>
        <p className="mt-0.5 text-sm text-neutral-500">
          AI & Automationen — Fundament aller Engines
        </p>
      </div>
      <AiNav />
      <div>{children}</div>
    </div>
  );
}
