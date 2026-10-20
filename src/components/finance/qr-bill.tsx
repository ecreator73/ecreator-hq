import { companyInfo } from "@/config/company";
import { formatIban, formatReference, qrPayload, qrSvg, unstructuredMessage, billInformation, type QrBillInput } from "@/lib/qr-bill";

/**
 * QR-Zahlteil mit Empfangsschein (210 x 105 mm) nach Swiss Payment Standards.
 * Bildschirm: als Vorschau unter der Rechnung. Druck: eigene A4-Seite ohne Rand,
 * Zahlteil am unteren Rand mit Trennlinien.
 */

const H = ({ children, big }: { children: React.ReactNode; big?: boolean }) => (
  <p className={big ? "mt-[3mm] text-[8pt] font-bold leading-[11pt]" : "mt-[2.5mm] text-[6pt] font-bold leading-[9pt]"}>{children}</p>
);
const V = ({ children, big }: { children: React.ReactNode; big?: boolean }) => (
  <div className={big ? "text-[10pt] leading-[11pt]" : "text-[8pt] leading-[9pt]"}>{children}</div>
);

function amount(rappen: number) {
  return (rappen / 100).toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/’|'/g, " ");
}

export function QrBill({ input }: { input: QrBillInput }) {
  const c = companyInfo;
  const svg = qrSvg(qrPayload(input));
  const d = input.debtor && input.debtor.name && input.debtor.zip && input.debtor.city ? input.debtor : null;
  const creditor = (
    <>
      <div>{formatIban(c.qrIban)}</div>
      <div>{c.name}</div>
      <div>{c.street}</div>
      <div>
        {c.zip} {c.city}
      </div>
    </>
  );
  const debtor = d ? (
    <>
      <div>{d.name}</div>
      {d.street ? <div>{d.street}</div> : null}
      <div>
        {d.zip} {d.city}
      </div>
    </>
  ) : null;

  return (
    <section className="qr-page mx-auto mt-6 w-full max-w-[210mm] print:relative print:mt-0 print:h-[297mm] print:max-w-none" aria-label="QR-Zahlteil">
      <p className="mb-2 text-xs text-neutral-500 print:hidden">QR-Zahlteil (wird auf einer eigenen Seite gedruckt)</p>
      <div className="flex h-[105mm] w-[210mm] max-w-full overflow-hidden border-t border-dashed border-neutral-500 bg-white font-sans text-black print:absolute print:bottom-0 print:left-0 print:max-w-none">
        {/* Empfangsschein */}
        <div className="flex w-[62mm] shrink-0 flex-col border-r border-dashed border-neutral-500 p-[5mm]">
          <p className="text-[11pt] font-bold">Empfangsschein</p>
          <div className="mt-[2mm] flex-1">
            <H>Konto / Zahlbar an</H>
            <V>{creditor}</V>
            {input.reference ? (
              <>
                <H>Referenz</H>
                <V>{formatReference(input.reference)}</V>
              </>
            ) : null}
            <H>Zahlbar durch</H>
            <V>{debtor ?? <span className="block h-[20mm] w-[52mm] border border-black" aria-label="Feld für Zahler" />}</V>
          </div>
          <div className="flex gap-[6mm]">
            <div>
              <p className="text-[6pt] font-bold">Währung</p>
              <p className="text-[8pt]">CHF</p>
            </div>
            <div>
              <p className="text-[6pt] font-bold">Betrag</p>
              <p className="text-[8pt] tabular-nums">{amount(input.total)}</p>
            </div>
          </div>
          <p className="mt-[3mm] text-right text-[6pt] font-bold">Annahmestelle</p>
        </div>

        {/* Zahlteil */}
        <div className="flex w-[148mm] p-[5mm]">
          <div className="flex w-[51mm] shrink-0 flex-col">
            <p className="text-[11pt] font-bold">Zahlteil</p>
            <div className="mt-[5mm] h-[46mm] w-[46mm]" dangerouslySetInnerHTML={{ __html: svg }} />
            <div className="mt-[5mm] flex gap-[6mm]">
              <div>
                <p className="text-[8pt] font-bold">Währung</p>
                <p className="text-[10pt]">CHF</p>
              </div>
              <div>
                <p className="text-[8pt] font-bold">Betrag</p>
                <p className="text-[10pt] tabular-nums">{amount(input.total)}</p>
              </div>
            </div>
          </div>
          <div className="min-w-0 flex-1 pl-[2mm]">
            <H big>Konto / Zahlbar an</H>
            <V big>{creditor}</V>
            {input.reference ? (
              <>
                <H big>Referenz</H>
                <V big>{formatReference(input.reference)}</V>
              </>
            ) : null}
            <H big>Zusätzliche Informationen</H>
            <V big>
              <div>{unstructuredMessage(input)}</div>
              <div className="break-all text-[8pt]">{billInformation(input)}</div>
            </V>
            <H big>Zahlbar durch</H>
            <V big>{debtor ?? <span className="block h-[25mm] w-[65mm] border border-black" aria-label="Feld für Zahler" />}</V>
          </div>
        </div>
      </div>
    </section>
  );
}
