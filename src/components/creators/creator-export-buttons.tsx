"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CreatorWithStats } from "@/types/entities";

/** Spalten des Exports (Reihenfolge fix). Preise als CHF (Rappen/100). */
const COLUMNS: { key: string; label: string }[] = [
  { key: "first_name", label: "Vorname" },
  { key: "last_name", label: "Nachname" },
  { key: "email", label: "E-Mail" },
  { key: "phone", label: "Telefon" },
  { key: "city", label: "Stadt" },
  { key: "canton", label: "Kanton" },
  { key: "full_day_rate", label: "Tagessatz (CHF)" },
  { key: "status", label: "Status" },
  { key: "score", label: "Score" },
  { key: "rating_avg", label: "Bewertung" },
];

function cellValues(c: CreatorWithStats): (string | number | null)[] {
  return [
    c.first_name,
    c.last_name ?? "",
    c.email ?? "",
    c.phone ?? "",
    c.city ?? "",
    c.canton ?? "",
    c.full_day_rate != null ? c.full_day_rate / 100 : "",
    c.status,
    c.score,
    c.rating_avg ?? "",
  ];
}

/** Wert fuer eine CSV-Zelle korrekt quoten (Excel-kompatibel). */
function csvCell(v: string | number | null): string {
  const s = v == null ? "" : String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function CreatorExportButtons({
  creators,
}: {
  creators: CreatorWithStats[];
}) {
  function exportCsv() {
    const header = COLUMNS.map((c) => csvCell(c.label)).join(",");
    const lines = creators.map((c) =>
      cellValues(c).map(csvCell).join(","),
    );
    // BOM fuer korrekte Umlaut-Darstellung in Excel.
    const csv = "﻿" + [header, ...lines].join("\r\n");
    download("creators.csv", csv, "text/csv;charset=utf-8;");
  }

  function exportJson() {
    const data = creators.map((c) => {
      const obj: Record<string, string | number | null> = {};
      COLUMNS.forEach((col, i) => {
        obj[col.key] = cellValues(c)[i];
      });
      return obj;
    });
    download(
      "creators.json",
      JSON.stringify(data, null, 2),
      "application/json;charset=utf-8;",
    );
  }

  const disabled = creators.length === 0;

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={exportCsv} disabled={disabled}>
        <Download className="h-4 w-4" />
        CSV (Excel)
      </Button>
      <Button variant="secondary" size="sm" onClick={exportJson} disabled={disabled}>
        <Download className="h-4 w-4" />
        JSON
      </Button>
    </div>
  );
}
