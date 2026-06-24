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
};

export default nextConfig;
