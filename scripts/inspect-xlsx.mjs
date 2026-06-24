/** Liest eine .xlsx und zeigt Struktur (Blaetter, Header, erste Zeilen). Read-only. */
import XLSX from "xlsx";

const path = process.argv[2];
if (!path) {
  console.error("Pfad fehlt.");
  process.exit(1);
}

const wb = XLSX.readFile(path, { cellDates: true });
console.log(`\nBlaetter (${wb.SheetNames.length}): ${wb.SheetNames.join(" | ")}`);

for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: "" });
  console.log(`\n===== Blatt "${name}" — ${rows.length} Zeilen =====`);
  const preview = rows.slice(0, 10);
  preview.forEach((r, i) => {
    const cells = (Array.isArray(r) ? r : []).map((c) => {
      if (c instanceof Date) return c.toISOString().slice(0, 10);
      const s = String(c);
      return s.length > 22 ? s.slice(0, 22) + "…" : s;
    });
    console.log(`  [${String(i).padStart(2)}] ${cells.join(" | ")}`);
  });
  if (rows.length > 10) console.log(`  … (${rows.length - 10} weitere Zeilen)`);
}
