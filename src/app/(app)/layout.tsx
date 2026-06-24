import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { ConfigBanner } from "@/components/config-banner";

/**
 * Geschuetztes App-Layout. requireUser() erzwingt eine gueltige Session
 * (Redirect auf /login). Zusaetzliche Absicherung zur Middleware.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <>
      <ConfigBanner />
      <AppShell
        user={{
          fullName: user.fullName,
          email: user.email,
          roles: user.roles,
          primaryRole: user.primaryRole,
        }}
      >
        {children}
      </AppShell>
    </>
  );
}
