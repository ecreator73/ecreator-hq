import type { Metadata } from "next";
import { PublicFooter, PublicHeader } from "@/components/public/public-frame";
import { CreatorApplicationForm } from "@/components/public/creator-application-form";

export const metadata: Metadata = {
  title: { absolute: "Model & UGC Creator werden | eCreator Schweiz" },
  description: "Bezahlte Content-Shootings mit Schweizer Unternehmen. Keine grosse Followerschaft nötig. Jetzt als Model oder UGC Creator bewerben.",
};

const BENEFITS = [
  ["Bezahlte Shootings", "Du erhältst bezahlte Anfragen für unterschiedliche Content-Produktionen."],
  ["Keine Follower-Pflicht", "Für uns zählt dein Auftritt vor der Kamera, nicht nur deine Reichweite."],
  ["Flexible Aufträge", "Du entscheidest selbst, welche Shootings zeitlich und inhaltlich zu dir passen."],
  ["Verschiedene Brands", "Arbeite bei Produktionen für unterschiedliche Schweizer Unternehmen und Branchen."],
];
const STEPS = [
  ["Bewerben", "Schick uns deine wichtigsten Infos und optional ein kurzes Video."],
  ["Profilprüfung", "Unser Team schaut sich deine Bewerbung an."],
  ["Aufträge erhalten", "Wenn du zu unserem Netzwerk passt, informieren wir dich über passende bezahlte Shootings."],
];
const FAQ = [
  ["Brauche ich viele Follower?", "Nein. Für viele Produktionen ist dein natürlicher Auftritt vor der Kamera wichtiger als deine Reichweite."],
  ["Muss ich Erfahrung haben?", "Nein. Wir suchen sowohl erfahrene Creator und Models als auch neue Gesichter."],
  ["Werden die Shootings bezahlt?", "Ja. Die konkrete Vergütung wird jeweils vor dem Auftrag kommuniziert und hängt von der Produktion ab."],
  ["Muss ich jeden Auftrag annehmen?", "Nein. Du entscheidest selbst, welche Shootings zu dir passen."],
  ["Wo finden die Shootings statt?", "Je nach Kunde und Produktion an unterschiedlichen Standorten in der Schweiz."],
];

export default function ModelPage() {
  return (
    <>
      <PublicHeader />
      <main>
        <section className="relative overflow-hidden border-b border-neutral-100 bg-[radial-gradient(ellipse_at_top_right,rgba(103,84,233,0.12),transparent_60%)]">
          <div className="mx-auto grid max-w-5xl gap-10 px-5 py-14 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">eCreator Creator Network</p>
              <h1 className="mt-3 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">Mit Content-Shootings Geld verdienen.</h1>
              <p className="mt-5 max-w-lg text-lg text-neutral-600">Wir suchen Models, UGC Creator und neue Gesichter für bezahlte Content-Produktionen mit Schweizer Unternehmen.</p>
              <ul className="mt-6 grid max-w-md grid-cols-2 gap-x-4 gap-y-2 text-sm text-neutral-700">
                {["Bezahlte Shootings", "Keine grosse Followerschaft nötig", "Flexible Aufträge", "Schweizweit"].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-600" aria-hidden /> {t}
                  </li>
                ))}
              </ul>
              <a href="#bewerben" className="mt-8 inline-flex h-12 items-center rounded-xl bg-brand-600 px-7 text-base font-semibold text-white shadow-sm hover:bg-brand-700">
                Jetzt bewerben
              </a>
            </div>
            <div className="hidden lg:block" aria-hidden>
              <div className="relative mx-auto aspect-[4/5] max-w-sm rounded-3xl border border-neutral-200 bg-neutral-950 p-6 text-white shadow-xl">
                <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-neutral-400">
                  <span>Rec</span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" /> 00:12
                  </span>
                </div>
                <div className="absolute inset-x-6 bottom-6">
                  <p className="text-sm text-neutral-400">Nächstes Shooting</p>
                  <p className="mt-1 text-2xl font-semibold leading-tight">Reel für eine Zürcher Bäckerei</p>
                  <p className="mt-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs">bezahlt · 2 Std. · Zürich</p>
                </div>
                <div className="absolute inset-6 top-14 rounded-2xl border border-white/10" />
              </div>
            </div>
          </div>
        </section>

        <section id="bewerben" className="scroll-mt-6 bg-neutral-50/70 py-14">
          <div className="mx-auto max-w-2xl px-5">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Jetzt als Creator bewerben</h2>
            <p className="mt-2 text-neutral-600">Bewirb dich in wenigen Minuten für unser Creator-Netzwerk.</p>
            <div className="mt-6">
              <CreatorApplicationForm />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-14">
          <h2 className="text-2xl font-bold tracking-tight">Warum Teil des eCreator Creator Networks werden?</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {BENEFITS.map(([t, d]) => (
              <div key={t} className="rounded-2xl border border-neutral-200 p-5">
                <h3 className="font-semibold">{t}</h3>
                <p className="mt-1 text-sm text-neutral-600">{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-neutral-100 bg-neutral-50/70">
          <div className="mx-auto max-w-5xl px-5 py-14">
            <h2 className="text-2xl font-bold tracking-tight">So funktioniert&apos;s</h2>
            <ol className="mt-6 grid gap-4 sm:grid-cols-3">
              {STEPS.map(([t, d], i) => (
                <li key={t} className="rounded-2xl bg-white p-5 shadow-sm">
                  <span className="text-sm font-semibold text-brand-700">Schritt {i + 1}</span>
                  <h3 className="mt-1 font-semibold">{t}</h3>
                  <p className="mt-1 text-sm text-neutral-600">{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-5 py-14">
          <h2 className="text-2xl font-bold tracking-tight">Häufige Fragen</h2>
          <div className="mt-6 divide-y divide-neutral-200 border-y border-neutral-200">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {q}
                  <span className="text-neutral-400 transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-2 text-neutral-600">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 pb-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Bereit für dein nächstes Shooting?</h2>
          <p className="mt-3 text-lg text-neutral-600">Bewirb dich jetzt und werde Teil des eCreator Creator Networks.</p>
          <a href="#bewerben" className="mt-7 inline-flex h-12 items-center rounded-xl bg-brand-600 px-8 text-base font-semibold text-white hover:bg-brand-700">
            Jetzt bewerben
          </a>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
