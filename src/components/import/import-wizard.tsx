"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Upload, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { parseCsv } from "@/lib/import/csv";
import { autoMap, IMPORT_SPECS, type ImportKind } from "@/lib/import/specs";
import { mapAndValidateRow } from "@/lib/import/validate";
import { formatCHF } from "@/lib/utils";
import {
  previewCustomersAction,
  importCustomersAction,
  importContractsAction,
  importInvoicesAction,
} from "@/app/(app)/clients/import/actions";
import type { CustomerImportOptions, CustomerPreview, ImportResult } from "@/server/services";

type Mapping = Record<string, string>;
const STEPS = ["Hochladen", "Zuordnen", "Pruefen", "Import"] as const;

const DEFAULT_OPTIONS: CustomerImportOptions = {
  revenueMode: "total",
  revenueBasis: "net",
  createContract: true,
  onDuplicate: "skip",
};

/**
 * Mehrstufiger CSV-Import-Wizard (Hochladen -> Zuordnen -> Pruefen -> Import).
 * Generisch ueber den Import-Typ (Kunden/Vertraege/Rechnungen). Validierung
 * laeuft live im Browser; Dubletten/MRR-Vorschau (Kunden) kommen vom Server.
 */
export function ImportWizard({ kind }: { kind: ImportKind }) {
  const spec = IMPORT_SPECS[kind];
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Mapping>({});
  const [options, setOptions] = useState<CustomerImportOptions>(DEFAULT_OPTIONS);
  const [preview, setPreview] = useState<CustomerPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function ingest(text: string) {
    const { headers: h, rows: r } = parseCsv(text);
    setHeaders(h);
    setRows(r);
    setMapping(autoMap(h, spec.fields));
    setError(null);
    if (r.length === 0) {
      setError("Keine Datenzeilen gefunden. Hat die Datei eine Kopfzeile?");
      return;
    }
    setStep(1);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => ingest(String(reader.result ?? ""));
    reader.readAsText(file, "utf-8");
  }

  // Live-Validierung (Browser) ueber alle Zeilen.
  const validated = useMemo(
    () => rows.map((r, i) => mapAndValidateRow(r, mapping, spec.fields, i)),
    [rows, mapping, spec.fields],
  );
  const invalidCount = validated.filter((v) => v.errors.length > 0).length;
  const validCount = validated.length - invalidCount;

  function loadServerPreview() {
    if (kind !== "customers") return;
    setError(null);
    startTransition(async () => {
      const res = await previewCustomersAction(rows, mapping, options);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPreview(res.data ?? null);
    });
  }

  function goToPreview() {
    setStep(2);
    if (kind === "customers") loadServerPreview();
  }

  function runImport() {
    setError(null);
    startTransition(async () => {
      const res =
        kind === "customers"
          ? await importCustomersAction(rows, mapping, options)
          : kind === "contracts"
            ? await importContractsAction(rows, mapping)
            : await importInvoicesAction(rows, mapping);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult(res.data ?? null);
      setStep(3);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {/* Stepper */}
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={
              "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium " +
              (i === step
                ? "border-brand-600 bg-brand-50 text-brand-700"
                : i < step
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-neutral-200 text-neutral-400")
            }
          >
            <span className="tabular-nums">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>

      {error ? (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      ) : null}

      {/* Step 1: Upload */}
      {step === 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">{spec.description}</p>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 px-6 py-10 text-center transition-colors hover:border-brand-300 hover:bg-brand-50/40">
            <Upload className="h-6 w-6 text-neutral-400" aria-hidden="true" />
            <span className="text-sm font-medium text-neutral-700">CSV-Datei waehlen</span>
            <span className="text-xs text-neutral-400">
              Aus Excel: Speichern unter &rarr; CSV UTF-8. Komma oder Semikolon, mit Kopfzeile.
            </span>
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
          </label>
          <details className="text-sm text-neutral-500">
            <summary className="cursor-pointer">Oder CSV-Text einfuegen</summary>
            <textarea
              rows={6}
              onChange={(e) => ingest(e.target.value)}
              placeholder={spec.fields.map((f) => f.label).join(";")}
              className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2 font-mono text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </details>
        </div>
      ) : null}

      {/* Step 2: Mapping */}
      {step === 1 ? (
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            {rows.length} Zeilen erkannt. Ordne die Spalten den Zielfeldern zu (automatisch
            vorbelegt).
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {spec.fields.map((field) => (
              <div key={field.key} className="flex items-center gap-3">
                <label className="w-40 shrink-0 text-sm text-neutral-700">
                  {field.label}
                  {field.required ? <span className="text-red-500"> *</span> : null}
                </label>
                <select
                  value={mapping[field.key] ?? ""}
                  onChange={(e) =>
                    setMapping((m) => ({ ...m, [field.key]: e.target.value }))
                  }
                  className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                >
                  <option value="">(nicht zuordnen)</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep(0)}>
              Zurueck
            </Button>
            <Button onClick={goToPreview}>
              Pruefen
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}

      {/* Step 3: Preview */}
      {step === 2 ? (
        <div className="space-y-4">
          {kind === "customers" ? (
            <div className="grid gap-3 rounded-lg border border-neutral-200 bg-neutral-50/60 p-4 sm:grid-cols-2">
              <OptionRow label={'„Umsatz“ ist …'}>
                <Toggle
                  value={options.revenueMode}
                  onChange={(v) => setOptions((o) => ({ ...o, revenueMode: v as "monthly" | "total" }))}
                  options={[
                    { key: "total", label: "Gesamtwert / Laufzeit" },
                    { key: "monthly", label: "Monatlich (MRR)" },
                  ]}
                />
              </OptionRow>
              <OptionRow label="Vertragswert aus">
                <Toggle
                  value={options.revenueBasis}
                  onChange={(v) => setOptions((o) => ({ ...o, revenueBasis: v as "gross" | "net" }))}
                  options={[
                    { key: "net", label: "Netto Umsatz" },
                    { key: "gross", label: "Umsatz" },
                  ]}
                />
              </OptionRow>
              <OptionRow label="Bei vorhandenem Kunden">
                <Toggle
                  value={options.onDuplicate}
                  onChange={(v) => setOptions((o) => ({ ...o, onDuplicate: v as "skip" | "create" }))}
                  options={[
                    { key: "skip", label: "Ueberspringen" },
                    { key: "create", label: "Trotzdem anlegen" },
                  ]}
                />
              </OptionRow>
              <OptionRow label="Aktiven Vertrag anlegen">
                <Toggle
                  value={options.createContract ? "yes" : "no"}
                  onChange={(v) => setOptions((o) => ({ ...o, createContract: v === "yes" }))}
                  options={[
                    { key: "yes", label: "Ja (MRR)" },
                    { key: "no", label: "Nein" },
                  ]}
                />
              </OptionRow>
              <div className="sm:col-span-2">
                <Button variant="secondary" size="sm" onClick={loadServerPreview} disabled={pending}>
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  Vorschau aktualisieren
                </Button>
              </div>
            </div>
          ) : null}

          {/* Summary */}
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge tone="green">{validCount} gueltig</Badge>
            {invalidCount > 0 ? <Badge tone="red">{invalidCount} fehlerhaft</Badge> : null}
            {preview ? (
              <>
                <Badge tone="brand">{preview.summary.willCreate} werden angelegt</Badge>
                {preview.summary.willSkip > 0 ? (
                  <Badge tone="amber">{preview.summary.willSkip} uebersprungen</Badge>
                ) : null}
                {preview.summary.duplicates > 0 ? (
                  <Badge tone="amber">{preview.summary.duplicates} Dubletten</Badge>
                ) : null}
                {options.createContract ? (
                  <Badge tone="neutral">MRR neu: {formatCHF(preview.summary.totalMrr)}</Badge>
                ) : null}
              </>
            ) : null}
          </div>

          {/* Preview table (first 25) */}
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-3 py-2">#</th>
                  {spec.fields.slice(0, 5).map((f) => (
                    <th key={f.key} className="px-3 py-2">
                      {f.label}
                    </th>
                  ))}
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {validated.slice(0, 25).map((v) => (
                  <tr key={v.index} className="border-t border-neutral-100">
                    <td className="px-3 py-1.5 tabular-nums text-neutral-400">{v.index + 1}</td>
                    {spec.fields.slice(0, 5).map((f) => (
                      <td key={f.key} className="px-3 py-1.5 text-neutral-700">
                        {fmtCell(f.type, v.values[f.key])}
                      </td>
                    ))}
                    <td className="px-3 py-1.5">
                      {v.errors.length ? (
                        <span className="text-xs text-red-600" title={v.errors.join("; ")}>
                          {v.errors.length} Fehler
                        </span>
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-500" aria-hidden="true" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {validated.length > 25 ? (
              <p className="border-t border-neutral-100 px-3 py-2 text-xs text-neutral-400">
                … und {validated.length - 25} weitere Zeilen.
              </p>
            ) : null}
          </div>

          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep(1)}>
              Zurueck
            </Button>
            <Button onClick={runImport} disabled={pending || validCount === 0}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              {validCount} importieren
            </Button>
          </div>
        </div>
      ) : null}

      {/* Step 4: Result */}
      {step === 3 && result ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
            Import abgeschlossen.
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            {result.clientsCreated > 0 ? <Badge tone="green">{result.clientsCreated} Kunden</Badge> : null}
            {result.contractsCreated > 0 ? (
              <Badge tone="green">{result.contractsCreated} Vertraege</Badge>
            ) : null}
            {result.invoicesCreated > 0 ? (
              <Badge tone="green">{result.invoicesCreated} Rechnungen</Badge>
            ) : null}
            {result.skipped > 0 ? <Badge tone="amber">{result.skipped} uebersprungen</Badge> : null}
            {result.errors.length > 0 ? <Badge tone="red">{result.errors.length} Fehler</Badge> : null}
          </div>
          {result.errors.length > 0 ? (
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-red-200 bg-red-50/60 p-3 text-xs text-red-700">
              {result.errors.slice(0, 50).map((e) => (
                <li key={e.row}>Zeile {e.row}: {e.error}</li>
              ))}
            </ul>
          ) : null}
          <div className="flex gap-2">
            <Link
              href="/clients"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white hover:bg-brand-700"
            >
              Zum Kunden-Dashboard
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Button
              variant="secondary"
              onClick={() => {
                setStep(0);
                setRows([]);
                setHeaders([]);
                setMapping({});
                setPreview(null);
                setResult(null);
              }}
            >
              Weiteren Import
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function fmtCell(type: string, value: string | number | null): string {
  if (value == null || value === "") return "—";
  if (type === "money" && typeof value === "number") return formatCHF(value);
  return String(value);
}

function OptionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-neutral-600">{label}</span>
      {children}
    </div>
  );
}

function Toggle({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { key: string; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-lg border border-neutral-200 p-0.5">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors " +
            (value === o.key ? "bg-brand-600 text-white" : "text-neutral-600 hover:text-neutral-900")
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
