import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** Rahmen der oeffentlichen Seiten: ohne App-Navigation, ohne Login. */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-white text-neutral-900 antialiased">{children}</div>;
}
