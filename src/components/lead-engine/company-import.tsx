"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { bulkImportLeadCompaniesAction } from "@/app/(app)/sales/lead-engine/actions";
import type { LeadCompanyCreateInput } from "@/lib/validation/lead-engine";

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

/** Bekannte Spalten-Header (CSV) -> Firmen-Feld. */
const KNOWN_HEADERS = [
  "name",
  "industry",
  "website",
  "phone",
  "email",
  "city",
  "canton",
  "country",
  "contact_name",
] as const;

type KnownHeader = (typeof KNOWN_HEADERS)[number];

/** Eine CSV-Zeile per Komma splitten (einfaches Format, optionale Quotes). */
function splitCsvLine(line: string): string[] {
  return line.split(",").map((c) => c.trim().replace(/^"|"$/g, "").trim());
}

/** CSV-Text -> LeadCompanyCreateInput[] (name Pflicht, sonst uebersprungen). */
function parseCsv(text: string): LeadCompanyCreateInput[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const colIndex = new Map<KnownHeader, number>();
  headers.forEach((h, i) => {
    if ((KNOWN_HEADERS as readonly string[]).includes(h)) {
      colIndex.set(h as KnownHeader, i);
    }
  });

  const rows: LeadCompanyCreateInput[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const get = (h: KnownHeader): string | undefined => {
      const idx = colIndex.get(h);
      if (idx == null) return undefined;
      const v = cells[idx]?.trim();
      return v ? v : undefined;
    };
    const name = get("name");
    if (!name) continue;
    rows.push({
      name,
      industry: get("industry"),
      website: get("website"),
      phone: get("phone"),
      email: get("email"),
      city: get("city"),
      canton: get("canton"),
      country: get("country"),
      contact_name: get("contact_name"),
    });
  }
  return rows;
}

export function CompanyImport() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    created: number;
    skipped: number;
    errors: { row: number; error: string }[];
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const rows = useMemo(() => parseCsv(text), [text]);

  function reset() {
    setText("");
    setError(null);
    setResult(null);
  }

  function close() {
    setOpen(false);
    reset();
  }

  function runImport() {
    setError(null);
    setResult(null);
    if (rows.length === 0) {
      setError(
        "Keine gueltigen Zeilen gefunden. Erste Zeile muss Spalten-Header enthalten, jede Datenzeile braucht einen Firmennamen (name).",
      );
      return;
    }
    startTransition(async () => {
      const res = await bulkImportLeadCompaniesAction(rows);
      if (res.ok) {
        setResult(res.data ?? { created: 0, skipped: 0, errors: [] });
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4" />
        CSV-Import
      </Button>

      <Modal
        open={open}
        onClose={close}
        title="Firmen importieren"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              {result ? "Schliessen" : "Abbrechen"}
            </Button>
            <Button onClick={runImport} disabled={pending || rows.length === 0}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importieren ...
                </>
              ) : (
                `Importieren (${rows.length})`
              )}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            CSV einfuegen &mdash; die erste Zeile ist die Kopfzeile. Erkannte
            Spalten:{" "}
            <span className="font-mono text-xs text-neutral-500">
              {KNOWN_HEADERS.join(", ")}
            </span>
            . Unbekannte Spalten werden ignoriert.
          </p>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            spellCheck={false}
            placeholder={
              "name,industry,website,city,canton\nMeier Treuhand AG,Treuhaender,https://meier-treuhand.ch,Zuerich,ZH\nKeller Immobilien,Immobilienmakler,,Winterthur,ZH"
            }
            className={`${inputClass} font-mono`}
          />

          <p className="text-sm text-neutral-500">
            {rows.length > 0
              ? `${rows.length} gueltige ${rows.length === 1 ? "Zeile" : "Zeilen"} erkannt.`
              : "Noch keine gueltigen Zeilen erkannt."}
          </p>

          {error ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {result ? (
            <div className="space-y-2">
              <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {result.created}{" "}
                  {result.created === 1 ? "Firma" : "Firmen"} importiert
                  {result.skipped > 0
                    ? `, ${result.skipped} uebersprungen`
                    : ""}
                  .
                </span>
              </div>
              {result.errors.length > 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  <p className="mb-1 font-medium">
                    {result.errors.length} Fehler:
                  </p>
                  <ul className="space-y-0.5">
                    {result.errors.map((e) => (
                      <li key={e.row}>
                        Zeile {e.row}: {e.error}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
