"use client";

import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { statusLabel } from "@/config/catalog";
import type { InvoiceWithClient } from "@/types/entities";

/** Spaltenkopf der CSV-Datei (Excel-kompatibel). */
const CSV_COLUMNS = [
  "invoice_number",
  "title",
  "client",
  "amount",
  "status",
  "due_date",
  "paid_date",
] as const;

/** Einen Wert CSV-sicher quoten (Excel, Semikolon-getrennt). */
function csvCell(value: string | number | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (/[";\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Eine Datei clientseitig herunterladen (Blob + temporaerer Link). */
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

export function FinanceExportButtons({
  invoices,
}: {
  invoices: InvoiceWithClient[];
}) {
  function exportCsv() {
    const rows = invoices.map((inv) =>
      [
        csvCell(inv.invoice_number),
        csvCell(inv.title),
        csvCell(inv.client?.name ?? null),
        csvCell(inv.amount == null ? null : inv.amount / 100),
        csvCell(statusLabel("invoice", inv.status)),
        csvCell(inv.due_date),
        csvCell(inv.paid_date),
      ].join(";"),
    );
    // BOM voranstellen, damit Excel UTF-8 korrekt erkennt.
    const content = "﻿" + [CSV_COLUMNS.join(";"), ...rows].join("\r\n");
    download("rechnungen.csv", content, "text/csv;charset=utf-8");
  }

  function exportJson() {
    const data = invoices.map((inv) => ({
      invoice_number: inv.invoice_number,
      title: inv.title,
      client: inv.client?.name ?? null,
      amount: inv.amount == null ? null : inv.amount / 100,
      status: inv.status,
      due_date: inv.due_date,
      paid_date: inv.paid_date,
    }));
    download(
      "rechnungen.json",
      JSON.stringify(data, null, 2),
      "application/json",
    );
  }

  const disabled = invoices.length === 0;

  return (
    <div className="inline-flex items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={exportCsv}
        disabled={disabled}
      >
        <FileDown className="h-4 w-4" />
        CSV (Excel)
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={exportJson}
        disabled={disabled}
      >
        <FileDown className="h-4 w-4" />
        JSON
      </Button>
    </div>
  );
}
