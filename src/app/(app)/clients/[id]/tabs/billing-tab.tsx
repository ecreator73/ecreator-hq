"use client";

import { ExternalLink } from "lucide-react";
import type { ClientWithStats, Contract } from "@/types/entities";
import type { ContractItem } from "@/server/services/client-leads.service";
import { formatCHF, formatDate } from "@/lib/utils";
import { Section, Meta, EmptyRow } from "../detail-ui";

const dash = (v: string | number | null | undefined) => (v == null || v === "" ? "–" : String(v));

function addMonths(iso: string, months: number): Date {
  const d = new Date(`${iso}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** Kündigungsfenster: Enddatum minus Kündigungsfrist (Tage). */
function cancelBy(c: Contract): string | null {
  const end = c.end_date ?? (c.start_date && c.duration_months ? addMonths(c.start_date, c.duration_months).toISOString().slice(0, 10) : null);
  if (!end) return null;
  const d = new Date(`${end}T00:00:00`);
  d.setDate(d.getDate() - (c.cancellation_notice_days ?? 0));
  return d.toISOString().slice(0, 10);
}

export function BillingTab({ client, contracts, items }: { client: ClientWithStats; contracts: Contract[]; items: ContractItem[] }) {
  const links = [
    { label: "Website", href: client.website },
    { label: "Instagram", href: client.instagram_url },
    { label: "Facebook", href: client.facebook_url },
    { label: "Google Drive", href: client.drive_url },
  ].filter((l): l is { label: string; href: string } => !!l.href);
  const billingAddress = [client.billing_address, [client.billing_zip, client.billing_city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const hasBilling = client.billing_name || client.billing_email || billingAddress;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Section title="Rechnungsadresse" description={hasBilling ? undefined : "Noch keine abweichende Rechnungsadresse"}>
        <dl className="grid grid-cols-2 gap-4">
          <Meta label="Firma">{dash(client.billing_name ?? client.name)}</Meta>
          <Meta label="Zuhanden">{dash(client.billing_contact ?? client.contact_name)}</Meta>
          <Meta label="Adresse">{billingAddress || dash([client.address, [client.zip_code, client.city].filter(Boolean).join(" ")].filter(Boolean).join(", "))}</Meta>
          <Meta label="UID">{dash(client.uid)}</Meta>
          <Meta label="Rechnung an">{dash(client.billing_email ?? client.email)}</Meta>
          <Meta label="Kopie an">{dash(client.billing_email_cc)}</Meta>
        </dl>
      </Section>

      <Section title="Konditionen">
        <dl className="grid grid-cols-2 gap-4">
          <Meta label="Brutto pro Monat">{client.monthly_gross != null ? formatCHF(client.monthly_gross) : "–"}</Meta>
          <Meta label="Provision pro Monat">{client.monthly_commission != null ? formatCHF(client.monthly_commission) : "–"}</Meta>
          <Meta label="Setup-Gebühr">{client.setup_fee != null ? formatCHF(client.setup_fee) : "–"}</Meta>
          <Meta label="Mindestlaufzeit">{client.minimum_term_months ? `${client.minimum_term_months} Monate` : dash(client.contract_duration)}</Meta>
          <Meta label="Vertragsbeginn">{client.contract_start_date ? formatDate(client.contract_start_date) : "–"}</Meta>
          <Meta label="Vertragsende">{client.contract_end_date ? formatDate(client.contract_end_date) : "–"}</Meta>
          <Meta label="Kündigungsfrist">{dash(client.cancellation_notice)}</Meta>
          <Meta label="Kontakt Geburtstag">{client.contact_birthday ? formatDate(client.contact_birthday) : "–"}</Meta>
        </dl>
        {client.financial_notes ? <p className="mt-4 whitespace-pre-line rounded-lg bg-neutral-50 p-3 text-sm text-neutral-700">{client.financial_notes}</p> : null}
      </Section>

      <Section title="Verträge und Positionen" className="lg:col-span-2">
        {contracts.length === 0 ? (
          <EmptyRow>Keine Verträge erfasst.</EmptyRow>
        ) : (
          <div className="space-y-5">
            {contracts.map((c) => {
              const its = items.filter((i) => i.contract_id === c.id);
              const monthly = its.filter((i) => i.recurring).reduce((s, i) => s + i.quantity * i.unit_price, 0);
              const by = cancelBy(c);
              return (
                <div key={c.id} className="rounded-lg border border-neutral-200">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 px-4 py-2.5">
                    <p className="text-sm font-medium text-neutral-900">
                      {c.title} {c.contract_number ? <span className="text-xs font-normal text-neutral-400">Nr. {c.contract_number}</span> : null}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {c.start_date ? formatDate(c.start_date) : "?"} – {c.end_date ? formatDate(c.end_date) : "offen"}
                      {c.auto_renew ? (c.renewal_months ? ` · verlängert sich um ${c.renewal_months} Mt.` : " · verlängert sich automatisch") : ""}
                      {by && c.status === "active" && by >= new Date().toISOString().slice(0, 10) ? ` · kündbar bis ${formatDate(by)}` : ""}
                    </p>
                  </div>
                  {its.length ? (
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-neutral-100">
                        {its.map((i) => (
                          <tr key={i.id}>
                            <td className="px-4 py-2">
                              <p className="text-neutral-800">{i.description}</p>
                              {i.detail ? <p className="text-xs text-neutral-500">{i.detail}</p> : null}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-right text-xs text-neutral-500 tabular-nums">
                              {i.quantity !== 1 ? `${i.quantity} × ` : ""}
                              {formatCHF(i.unit_price)}
                              {i.recurring ? " / Mt." : ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-neutral-200">
                          <td className="px-4 py-2 text-xs font-medium text-neutral-600">Total wiederkehrend</td>
                          <td className="px-3 py-2 text-right text-sm font-semibold tabular-nums">{formatCHF(monthly)} / Mt.</td>
                        </tr>
                      </tfoot>
                    </table>
                  ) : (
                    <p className="px-4 py-3 text-xs text-neutral-500">Keine Positionen. Monatswert: {c.value_monthly != null ? formatCHF(c.value_monthly) : "–"}</p>
                  )}
                  {c.payment_terms || c.notes ? <p className="border-t border-neutral-100 px-4 py-2 text-xs text-neutral-500">{[c.payment_terms, c.notes].filter(Boolean).join(" · ")}</p> : null}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Links" className="lg:col-span-2">
        {links.length === 0 ? (
          <EmptyRow>Keine Links hinterlegt.</EmptyRow>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {links.map((l) => (
              <li key={l.label}>
                <a href={l.href.startsWith("http") ? l.href : `https://${l.href}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50">
                  {l.label} <ExternalLink className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
