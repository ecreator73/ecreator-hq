/** @type {import('next').NextConfig} */
const nextConfig = {
  // Phase 1: Linting laeuft separat (npm run lint); Build soll nicht an Lint-Regeln scheitern.
  eslint: {
    ignoreDuringBuilds: true,
  },
  // TypeScript-Fehler sollen den Build bewusst stoppen (Qualitaetssicherung).
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    // Client-Router-Cache: kuerzlich besuchte dynamische Seiten bleiben 30s im
    // Browser-Cache -> Hin- und Herwechseln zwischen Bereichen ist sofort.
    // Mutationen rufen router.refresh()/revalidatePath auf und umgehen das.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
