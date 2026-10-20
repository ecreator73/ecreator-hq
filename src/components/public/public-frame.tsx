import { companyInfo, companyFooterLine } from "@/config/company";

/** Kopf und Fuss der oeffentlichen Seiten im eCreator-Look. */
export function PublicHeader({ badge }: { badge?: string }) {
  return (
    <header className="border-b border-neutral-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={companyInfo.logoSrc} alt={companyInfo.name} className="h-8 w-auto" />
        {badge ? <span className="rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-600">{badge}</span> : null}
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="mt-16 border-t border-neutral-100">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs text-neutral-500">
        <span>{companyFooterLine()}</span>
        <span className="flex gap-4">
          <a href="https://www.ecreator.ch/impressum" className="hover:text-neutral-800">
            Impressum
          </a>
          <a href="https://www.ecreator.ch/datenschutz" className="hover:text-neutral-800">
            Datenschutz
          </a>
        </span>
      </div>
    </footer>
  );
}

export function PublicPage({ badge, children, wide }: { badge?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <>
      <PublicHeader badge={badge} />
      <main className={wide ? "mx-auto max-w-5xl px-5 py-10" : "mx-auto max-w-3xl px-5 py-10"}>{children}</main>
      <PublicFooter />
    </>
  );
}

export function PublicMessage({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <PublicPage>
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {children ? <div className="mx-auto mt-3 max-w-md text-neutral-600">{children}</div> : null}
      </div>
    </PublicPage>
  );
}
