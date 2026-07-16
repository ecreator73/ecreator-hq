"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { parseCsv } from "@/lib/import/csv";
import { importProspectsAction } from "@/app/(app)/sales/linkedin/actions";
import type { LinkedInImportRow } from "@/lib/validation/linkedin";

const selectClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-2 text-sm text-neutral-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

const TARGETS = [
  { key: "full_name", label: "Name *" },
  { key: "company_name", label: "Firma" },
  { key: "position", label: "Position" },
  { key: "linkedin_url", label: "LinkedIn URL" },
  { key: "website", label: "Website" },
  { key: "location", label: "Standort" },
  { key: "industry", label: "Branche" },
] as const;

type TargetKey = (typeof TARGETS)[number]["key"];
type Mapping = Record<TargetKey, string>;

/** Aliase (kleingeschrieben) je Zielfeld fuer das Auto-Mapping. */
const ALIASES: Record<TargetKey, string[]> = {
  full_name: ["full_name", "fullname", "full name", "name", "vorname nachname", "kontakt", "ansprechpartner"],
  company_name: ["company_name", "firma", "unternehmen", "company"],
  position: ["position", "titel", "title", "rolle", "funktion"],
  linkedin_url: ["linkedin_url", "linkedin", "profil", "profile"],
  website: ["website", "webseite", "web"],
  location: ["location", "standort", "ort", "region", "stadt"],
  industry: ["industry", "branche"],
};

/**
 * Reihenfolge fuer das Auto-Mapping: spezifische Felder zuerst, damit z.B.
 * "Firmenname" ueber "firma" gegriffen wird, bevor full_name "name" matcht.
 */
const AUTO_ORDER: TargetKey[] = [
  "linkedin_url",
  "website",
  "company_name",
  "position",
  "location",
  "industry",
  "full_name",
];

function emptyMapping(): Mapping {
  return {
    full_name: "",
    company_name: "",
    position: "",
    linkedin_url: "",
    website: "",
    location: "",
    industry: "",
  };
}

function autoMap(headers: string[]): Mapping {
  const map = emptyMapping();
  const claimed = new Set<string>();
  // Pass 1: exakte Treffer
  for (const t of AUTO_ORDER) {
    const hit = headers.find(
      (h) => !claimed.has(h) && ALIASES[t].includes(h.trim().toLowerCase()),
    );
    if (hit) {
      map[t] = hit;
      claimed.add(hit);
    }
  }
  // Pass 2: Teilstring-Treffer
  for (const t of AUTO_ORDER) {
    if (map[t]) continue;
    const hit = headers.find(
      (h) =>
        !claimed.has(h) &&
        ALIASES[t].some((a) => h.trim().toLowerCase().includes(a)),
    );
    if (hit) {
      map[t] = hit;
      claimed.add(hit);
    }
  }
  return map;
}

export function ProspectImport({
  open,
  onClose,
  campaigns,
}: {
  open: boolean;
  onClose: () => void;
  campaigns: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Mapping>(emptyMapping());
  const [campaignId, setCampaignId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    created: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const [pending, startTransition] = useTransition();

  // Beim Oeffnen alles zuruecksetzen.
  useEffect(() => {
    if (!open) return;
    setFileName(null);
    setHeaders([]);
    setRows([]);
    setMapping(emptyMapping());
    setCampaignId("");
    setError(null);
    setResult(null);
  }, [open]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCsv(String(reader.result ?? ""));
      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        setError("Die Datei enthaelt keine auswertbaren Zeilen.");
        setFileName(null);
        setHeaders([]);
        setRows([]);
        return;
      }
      setFileName(file.name);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setMapping(autoMap(parsed.headers));
    };
    reader.onerror = () => setError("Datei konnte nicht gelesen werden.");
    reader.readAsText(file);
  }

  function mappedValue(row: Record<string, string>, target: TargetKey) {
    const col = mapping[target];
    return col ? (row[col] ?? "") : "";
  }

  function runImport() {
    setError(null);
    if (!mapping.full_name) {
      setError("Bitte die Spalte fuer den Namen zuordnen.");
      return;
    }
    const importRows: LinkedInImportRow[] = rows.map((r) => ({
      full_name: mappedValue(r, "full_name"),
      company_name: mappedValue(r, "company_name") || undefined,
      position: mappedValue(r, "position") || undefined,
      linkedin_url: mappedValue(r, "linkedin_url") || undefined,
      website: mappedValue(r, "website") || undefined,
      location: mappedValue(r, "location") || undefined,
      industry: mappedValue(r, "industry") || undefined,
    }));
    startTransition(async () => {
      const res = await importProspectsAction(importRows, campaignId || undefined);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult(res.data ?? { created: 0, skipped: 0, errors: [] });
      router.refresh();
    });
  }

  const preview = rows.slice(0, 5);

  return (
    <Modal open={open} onClose={onClose} title="Prospects aus CSV importieren" size="lg">
      <div className="space-y-4">
        {result ? (
          /* Ergebnis */
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Import abgeschlossen: {result.created} erstellt,{" "}
                {result.skipped} uebersprungen (Duplikate),{" "}
                {result.errors.length} Fehler.
              </span>
            </div>
            {result.errors.length > 0 ? (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <ul className="list-disc space-y-0.5 pl-4">
                  {result.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="flex justify-end">
              <Button onClick={onClose}>Fertig</Button>
            </div>
          </div>
        ) : (
          <>
            {/* Datei-Auswahl */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-neutral-700">
                CSV-Datei
              </label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={onFile}
                className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700"
              />
              {fileName ? (
                <p className="text-xs text-neutral-500">
                  {fileName} · {rows.length} Zeile(n) erkannt
                </p>
              ) : (
                <p className="text-xs text-neutral-400">
                  Erwartet eine Kopfzeile (z.B. Name, Firma, Position, LinkedIn,
                  Website, Standort, Branche). Komma, Semikolon oder Tab als
                  Trennzeichen.
                </p>
              )}
            </div>

            {headers.length > 0 ? (
              <>
                {/* Spalten-Zuordnung */}
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-neutral-700">
                    Spalten zuordnen
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {TARGETS.map((t) => (
                      <div key={t.key} className="space-y-1">
                        <label className="block text-xs font-medium text-neutral-500">
                          {t.label}
                        </label>
                        <select
                          value={mapping[t.key]}
                          onChange={(e) =>
                            setMapping((m) => ({ ...m, [t.key]: e.target.value }))
                          }
                          aria-label={`Spalte fuer ${t.label} waehlen`}
                          className={selectClass}
                        >
                          <option value="">- nicht importieren -</option>
                          {headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Kampagne */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-neutral-700">
                    Kampagne zuweisen
                  </label>
                  <select
                    value={campaignId}
                    onChange={(e) => setCampaignId(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">- keine -</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Vorschau */}
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-neutral-700">
                    Vorschau (erste {preview.length} Zeilen)
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-neutral-200">
                    <table className="w-full min-w-[40rem] text-xs">
                      <thead>
                        <tr className="border-b border-neutral-200 text-left uppercase tracking-wide text-neutral-400">
                          {TARGETS.map((t) => (
                            <th key={t.key} className="px-3 py-2 font-medium">
                              {t.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {preview.map((r, i) => (
                          <tr key={i}>
                            {TARGETS.map((t) => (
                              <td key={t.key} className="max-w-[12rem] px-3 py-2 text-neutral-600">
                                <span className="block truncate">
                                  {mappedValue(r, t.key) || "-"}
                                </span>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}

            {error ? (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={onClose}>
                Abbrechen
              </Button>
              <Button
                type="button"
                onClick={runImport}
                disabled={pending || rows.length === 0 || !mapping.full_name}
              >
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importieren ...
                  </>
                ) : (
                  `${rows.length > 0 ? rows.length + " " : ""}Prospects importieren`
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
