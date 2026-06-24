import { getContext, ServiceError } from "./_helpers";
import { clientsService } from "./clients.service";
import { contractsService } from "./contracts.service";
import { invoicesService } from "./invoices.service";
import { mapAndValidateRow, type ImportValue } from "@/lib/import/validate";
import { addMonthsIso } from "@/lib/import/parse";
import {
  CUSTOMER_IMPORT_FIELDS,
  CONTRACT_IMPORT_FIELDS,
  INVOICE_IMPORT_FIELDS,
} from "@/lib/import/specs";

/**
 * Import-Engine. Validiert Rohzeilen (CSV) gegen die Spec, erkennt Dubletten
 * (Kunde per Name) und schreibt Kunden/Vertraege/Rechnungen in die bestehenden
 * Tabellen ueber die Service-Schicht (inkl. Validierung + Audit). Bietet je
 * Import-Typ eine `preview*`- (kein Schreiben) und eine `import*`-Methode.
 */

export interface CustomerImportOptions {
  /** Ist "Umsatz" monatlich (MRR) oder Gesamtwert ueber die Laufzeit? */
  revenueMode: "monthly" | "total";
  /** Welcher Umsatz wird als Vertragswert genommen? */
  revenueBasis: "gross" | "net";
  /** Zusaetzlich einen aktiven Vertrag (mit MRR) anlegen? */
  createContract: boolean;
  /** Verhalten bei bereits existierendem Kunden (per Name). */
  onDuplicate: "skip" | "create";
}

export interface ImportResult {
  total: number;
  clientsCreated: number;
  contractsCreated: number;
  invoicesCreated: number;
  skipped: number;
  errors: { row: number; error: string }[];
}

export interface CustomerPreviewRow {
  row: number;
  name: string;
  duplicate: boolean;
  valueMonthly: number | null;
  valueTotal: number | null;
  startDate: string | null;
  endDate: string | null;
  errors: string[];
  action: "create" | "skip" | "error";
}

export interface CustomerPreview {
  rows: CustomerPreviewRow[];
  summary: {
    total: number;
    willCreate: number;
    willSkip: number;
    invalid: number;
    duplicates: number;
    totalMrr: number;
  };
}

type Raw = Record<string, string>;
type Mapping = Record<string, string>;

async function loadClientNameMap(): Promise<Map<string, string>> {
  const { supabase } = await getContext();
  const { data } = await supabase.from("clients").select("id,name").is("deleted_at", null);
  const map = new Map<string, string>();
  for (const c of (data ?? []) as { id: string; name: string }[]) {
    if (c.name) map.set(c.name.trim().toLowerCase(), c.id);
  }
  return map;
}

function pickRevenue(values: Record<string, ImportValue>, basis: "gross" | "net"): number | null {
  const net = values.revenue_net as number | null;
  const gross = values.revenue_gross as number | null;
  return basis === "net" ? (net ?? gross ?? null) : (gross ?? net ?? null);
}

/** Leitet Vertragswerte aus Umsatz/Laufzeit/Modus ab. */
function deriveContract(values: Record<string, ImportValue>, options: CustomerImportOptions) {
  const revenue = pickRevenue(values, options.revenueBasis);
  const term = (values.term_months as number | null) ?? null;
  const start = (values.start_date as string | null) ?? null;
  let valueMonthly: number | null = null;
  let valueTotal: number | null = null;
  if (revenue != null) {
    if (options.revenueMode === "monthly") {
      valueMonthly = revenue;
      valueTotal = term ? revenue * term : null;
    } else {
      valueTotal = revenue;
      valueMonthly = term && term > 0 ? Math.round(revenue / term) : null;
    }
  }
  const endDate = start && term ? addMonthsIso(start, term) : null;
  return { valueMonthly, valueTotal, startDate: start, endDate };
}

export const importService = {
  /** Kunden-Vorschau: validiert + prueft Dubletten, ohne zu schreiben. */
  async previewCustomers(rawRows: Raw[], mapping: Mapping, options: CustomerImportOptions): Promise<CustomerPreview> {
    const nameMap = await loadClientNameMap();
    const seen = new Set<string>();
    const rows: CustomerPreviewRow[] = [];
    let willCreate = 0;
    let willSkip = 0;
    let invalid = 0;
    let duplicates = 0;
    let totalMrr = 0;

    rawRows.forEach((raw, i) => {
      const r = mapAndValidateRow(raw, mapping, CUSTOMER_IMPORT_FIELDS, i);
      const name = (r.values.name as string | null)?.trim() ?? "";
      const key = name.toLowerCase();
      const derived = deriveContract(r.values, options);
      const existsInDb = !!key && nameMap.has(key);
      const dupInCsv = !!key && seen.has(key);
      if (key) seen.add(key);

      let action: CustomerPreviewRow["action"] = "create";
      const errors = [...r.errors];
      if (errors.length) {
        action = "error";
        invalid++;
      } else if (dupInCsv || (existsInDb && options.onDuplicate === "skip")) {
        action = "skip";
        willSkip++;
        if (existsInDb) duplicates++;
      } else {
        action = "create";
        willCreate++;
        if (options.createContract && derived.valueMonthly) totalMrr += derived.valueMonthly;
      }

      rows.push({
        row: i + 1,
        name: name || "(ohne Name)",
        duplicate: existsInDb,
        valueMonthly: derived.valueMonthly,
        valueTotal: derived.valueTotal,
        startDate: derived.startDate,
        endDate: derived.endDate,
        errors,
        action,
      });
    });

    return {
      rows,
      summary: { total: rawRows.length, willCreate, willSkip, invalid, duplicates, totalMrr },
    };
  },

  /** Kunden importieren: Kunde (aktiv) + optional aktiver Vertrag (MRR). */
  async importCustomers(rawRows: Raw[], mapping: Mapping, options: CustomerImportOptions): Promise<ImportResult> {
    const nameMap = await loadClientNameMap();
    const seen = new Set<string>();
    const result: ImportResult = {
      total: rawRows.length,
      clientsCreated: 0,
      contractsCreated: 0,
      invoicesCreated: 0,
      skipped: 0,
      errors: [],
    };

    for (let i = 0; i < rawRows.length; i++) {
      const rowNo = i + 1;
      const r = mapAndValidateRow(rawRows[i]!, mapping, CUSTOMER_IMPORT_FIELDS, i);
      if (r.errors.length) {
        result.errors.push({ row: rowNo, error: r.errors.join("; ") });
        continue;
      }
      const name = (r.values.name as string).trim();
      const key = name.toLowerCase();
      if (seen.has(key)) {
        result.skipped++;
        continue;
      }
      seen.add(key);

      try {
        let clientId = nameMap.get(key);
        if (clientId) {
          if (options.onDuplicate === "skip") {
            result.skipped++;
            continue;
          }
        } else {
          const client = await clientsService.create({
            name,
            status: "active",
            start_date: (r.values.start_date as string | null) ?? undefined,
            notes: (r.values.notes as string | null) ?? undefined,
          });
          clientId = client.id;
          nameMap.set(key, clientId);
          result.clientsCreated++;
        }

        if (options.createContract && clientId) {
          const d = deriveContract(r.values, options);
          await contractsService.create({
            client_id: clientId,
            title: "Vertrag",
            status: "active",
            start_date: d.startDate ?? undefined,
            end_date: d.endDate ?? undefined,
            value_monthly: d.valueMonthly ?? undefined,
            value_total: d.valueTotal ?? undefined,
          });
          result.contractsCreated++;
        }
      } catch (e) {
        result.errors.push({ row: rowNo, error: e instanceof Error ? e.message : "Fehler" });
      }
    }

    return result;
  },

  /** Vertraege zu bestehenden Kunden importieren (Match per Name). */
  async importContracts(rawRows: Raw[], mapping: Mapping): Promise<ImportResult> {
    const nameMap = await loadClientNameMap();
    const result: ImportResult = {
      total: rawRows.length,
      clientsCreated: 0,
      contractsCreated: 0,
      invoicesCreated: 0,
      skipped: 0,
      errors: [],
    };

    for (let i = 0; i < rawRows.length; i++) {
      const rowNo = i + 1;
      const r = mapAndValidateRow(rawRows[i]!, mapping, CONTRACT_IMPORT_FIELDS, i);
      if (r.errors.length) {
        result.errors.push({ row: rowNo, error: r.errors.join("; ") });
        continue;
      }
      const name = (r.values.client_name as string).trim();
      const clientId = nameMap.get(name.toLowerCase());
      if (!clientId) {
        result.errors.push({ row: rowNo, error: `Kunde nicht gefunden: ${name}` });
        continue;
      }
      const term = r.values.term_months as number | null;
      const start = r.values.start_date as string | null;
      const end =
        (r.values.end_date as string | null) ?? (start && term ? addMonthsIso(start, term) : null);
      try {
        await contractsService.create({
          client_id: clientId,
          title: (r.values.title as string | null) ?? "Vertrag",
          contract_type: (r.values.contract_type as string | null) as never,
          status: ((r.values.status as string | null) ?? "active") as never,
          start_date: start ?? undefined,
          end_date: end ?? undefined,
          value_monthly: (r.values.value_monthly as number | null) ?? undefined,
          value_total: (r.values.value_total as number | null) ?? undefined,
        });
        result.contractsCreated++;
      } catch (e) {
        result.errors.push({ row: rowNo, error: e instanceof Error ? e.message : "Fehler" });
      }
    }
    return result;
  },

  /** Rechnungen importieren (Kunde optional per Name). */
  async importInvoices(rawRows: Raw[], mapping: Mapping): Promise<ImportResult> {
    const nameMap = await loadClientNameMap();
    const result: ImportResult = {
      total: rawRows.length,
      clientsCreated: 0,
      contractsCreated: 0,
      invoicesCreated: 0,
      skipped: 0,
      errors: [],
    };

    for (let i = 0; i < rawRows.length; i++) {
      const rowNo = i + 1;
      const r = mapAndValidateRow(rawRows[i]!, mapping, INVOICE_IMPORT_FIELDS, i);
      if (r.errors.length) {
        result.errors.push({ row: rowNo, error: r.errors.join("; ") });
        continue;
      }
      const cname = (r.values.client_name as string | null)?.trim() ?? "";
      const clientId = cname ? nameMap.get(cname.toLowerCase()) : undefined;
      const paid = r.values.paid_date as string | null;
      const status = (r.values.status as string | null) ?? (paid ? "paid" : "open");
      try {
        await invoicesService.create({
          client_id: clientId ?? undefined,
          invoice_number: (r.values.invoice_number as string | null) ?? undefined,
          title: (r.values.title as string | null) ?? undefined,
          amount: (r.values.amount as number | null) ?? undefined,
          vat: (r.values.vat as number | null) ?? undefined,
          due_date: (r.values.due_date as string | null) ?? undefined,
          paid_date: paid ?? undefined,
          status: status as never,
        });
        result.invoicesCreated++;
      } catch (e) {
        result.errors.push({ row: rowNo, error: e instanceof Error ? e.message : "Fehler" });
      }
    }
    return result;
  },

  /** Bulk-Edit: gleiche Aenderung auf viele Kunden anwenden. */
  async bulkUpdateClients(
    ids: string[],
    patch: { status?: string; account_manager_id?: string | null },
  ): Promise<{ updated: number; errors: { id: string; error: string }[] }> {
    let updated = 0;
    const errors: { id: string; error: string }[] = [];
    for (const id of ids) {
      try {
        await clientsService.update(id, patch as never);
        updated++;
      } catch (e) {
        errors.push({ id, error: e instanceof Error ? e.message : "Fehler" });
      }
    }
    return { updated, errors };
  },

  /** Bulk-Edit: gleiche Aenderung auf viele Vertraege anwenden. */
  async bulkUpdateContracts(
    ids: string[],
    patch: { status?: string },
  ): Promise<{ updated: number; errors: { id: string; error: string }[] }> {
    let updated = 0;
    const errors: { id: string; error: string }[] = [];
    for (const id of ids) {
      try {
        await contractsService.update(id, patch as never);
        updated++;
      } catch (e) {
        errors.push({ id, error: e instanceof Error ? e.message : "Fehler" });
      }
    }
    return { updated, errors };
  },
};
