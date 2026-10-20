import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { loadSignDocument, parseKind } from "@/server/services/sign-documents";
import { PublicMessage, PublicPage } from "@/components/public/public-frame";
import { SignatureForm } from "@/components/public/signature-form";
import { companyInfo } from "@/config/company";
import { formatCHFExact } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ kind: string }> }): Promise<Metadata> {
  const { kind } = await params;
  return { title: { absolute: `${parseKind(kind) === "offer" ? "Offerte" : "Vertrag"} unterschreiben · eCreator` } };
}

const chDate = (d: string | null) => (d ? `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}` : "–");

export default async function SignPage({ params }: { params: Promise<{ kind: string; token: string }> }) {
  const { kind: raw, token } = await params;
  const kind = parseKind(raw);
  const doc = kind ? await loadSignDocument(kind, token).catch(() => null) : null;
  if (!doc) return <PublicMessage title="Dokument nicht gefunden">Der Link ist ungültig oder abgelaufen. Bitte wenden Sie sich an Ihre Ansprechperson bei eCreator.</PublicMessage>;

  const isOffer = doc.kind === "offer";
  const vat = Math.round((doc.net * doc.vatRate) / 100 / 5) * 5;
  const facts = [
    isOffer ? ["Datum", chDate(doc.date)] : null,
    isOffer && doc.validUntil ? ["Gültig bis", chDate(doc.validUntil)] : null,
    doc.start ? ["Start", chDate(doc.start)] : null,
    !isOffer && doc.end ? ["Ende", chDate(doc.end)] : null,
    doc.durationMonths ? ["Laufzeit", `${doc.durationMonths} Monate`] : null,
  ].filter((x): x is string[] => !!x);

  return (
    <PublicPage badge={isOffer ? "Offerte" : "Vertrag"}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
        {isOffer ? "Offerte" : "Vertrag"} {doc.number ?? ""}
      </p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">{doc.title}</h1>
      <p className="mt-2 whitespace-pre-line text-sm text-neutral-600">{[doc.client.name, ...doc.client.lines].join("\n")}</p>

      {facts.length ? (
        <dl className="mt-6 grid grid-cols-2 gap-4 rounded-xl bg-neutral-50 p-4 text-sm sm:grid-cols-4">
          {facts.map(([l, v]) => (
            <div key={l}>
              <dt className="text-xs text-neutral-500">{l}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {doc.items.length ? (
        <ul className="mt-6 divide-y divide-neutral-200 rounded-xl border border-neutral-200">
          {doc.items.map((it, i) => (
            <li key={i} className="flex justify-between gap-4 p-4 text-sm">
              <div className="min-w-0">
                <p className="font-medium">{it.title}</p>
                {it.detail ? <p className="mt-0.5 whitespace-pre-line text-neutral-500">{it.detail}</p> : null}
                <p className="mt-0.5 text-xs text-neutral-500">
                  {it.quantity} × {formatCHFExact(it.unit_price)}
                  {it.recurring ? " pro Monat" : ""}
                </p>
              </div>
              <p className="shrink-0 tabular-nums">{formatCHFExact(Math.round(it.quantity * it.unit_price))}</p>
            </li>
          ))}
        </ul>
      ) : null}
      <dl className="ml-auto mt-4 max-w-xs space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-neutral-500">{isOffer ? "Zwischensumme" : "Betrag"} exkl. MWST</dt>
          <dd className="tabular-nums">{formatCHFExact(doc.net)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-neutral-500">MWST {doc.vatRate} %</dt>
          <dd className="tabular-nums">{formatCHFExact(vat)}</dd>
        </div>
        <div className="flex justify-between border-t border-neutral-200 pt-1 font-semibold">
          <dt>Total{!isOffer && doc.items.some((i) => i.recurring) ? " pro Monat" : ""}</dt>
          <dd className="tabular-nums">{formatCHFExact(doc.net + vat)}</dd>
        </div>
      </dl>

      {doc.paymentTerms ? (
        <section className="mt-6 text-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Zahlungsbedingungen</h2>
          <p className="mt-1 whitespace-pre-line">{doc.paymentTerms}</p>
        </section>
      ) : null}
      {doc.notes ? (
        <section className="mt-4 text-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{isOffer ? "Umfang" : "Leistungen & Bedingungen"}</h2>
          <p className="mt-1 whitespace-pre-line">{doc.notes}</p>
        </section>
      ) : null}
      <p className="mt-4 text-xs text-neutral-500">{companyInfo.termsNote}</p>

      <div className="mt-10">
        {doc.signedAt ? (
          <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" role="status">
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
            Unterschrieben{doc.signedName ? ` von ${doc.signedName}` : ""} am {chDate(doc.signedAt.slice(0, 10))}. Vielen Dank, wir melden uns bei Ihnen.
          </p>
        ) : doc.expired ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Diese Offerte ist abgelaufen. Bitte kontaktieren Sie uns für eine aktuelle Offerte.</p>
        ) : (
          <SignatureForm kind={doc.kind} token={token} />
        )}
      </div>
    </PublicPage>
  );
}
