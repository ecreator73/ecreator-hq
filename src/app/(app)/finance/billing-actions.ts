"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAudit } from "@/lib/activity";
import { qrReference } from "@/lib/qr-bill";
import type { RoleKey } from "@/config/roles";

/**
 * Rechnungen: Monatsrechnungen aus Vertraegen, Entwuerfe bearbeiten, freigeben,
 * Zahlungen (manuell oder aus dem Kontoauszug), Mahnstufe, Storno.
 * Es werden KEINE E-Mails verschickt. Betraege in Rappen.
 */

const ROLES: RoleKey[] = ["super_admin", "ceo", "finance"];
const VAT = 8.1;
type Result = { ok: true; message?: string } | { ok: false; error: string };
const fail = (e: unknown): { ok: false; error: string } => ({
  ok: false,
  error: e instanceof z.ZodError ? "Eingabe ungültig" : e instanceof Error ? e.message.slice(0, 300) : "Unbekannter Fehler",
});
const uuid = z.string().uuid();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

async function guard() {
  const user = await requireUser();
  if (!canAccess(user.roles, ROLES)) throw new Error("Keine Berechtigung für Finance");
  return { user, db: createAdminClient() };
}
type Db = ReturnType<typeof createAdminClient>;
const check = <T = unknown,>(r: { data?: unknown; error: { message: string } | null }): T => {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
};
const refresh = (id?: string) => {
  revalidatePath("/finance", "layout");
  if (id) revalidatePath(`/finance/invoices/${id}`);
};
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
/** MWST auf 5 Rappen gerundet (wie im bisherigen CRM). */
const vatOf = (net: number, rate: number) => Math.round((net * rate) / 100 / 5) * 5;

/** Kundennummer des Kunden (vergibt die naechste freie, falls noch keine). */
async function customerNumber(db: Db, clientId: string): Promise<number> {
  const c = check<{ customer_number: number | null }>(await db.from("clients").select("customer_number").eq("id", clientId).single());
  if (c.customer_number) return c.customer_number;
  const max = check<Array<{ customer_number: number }>>(await db.from("clients").select("customer_number").not("customer_number", "is", null).order("customer_number", { ascending: false }).limit(1));
  const next = Math.max(100000, max[0]?.customer_number ?? 100000) + 1;
  check(await db.from("clients").update({ customer_number: next }).eq("id", clientId));
  return next;
}

/** Naechste Rechnungs-Laufnummer (ueber alle Rechnungen). */
async function nextSeq(db: Db): Promise<number> {
  const r = check<Array<{ invoice_seq: number }>>(await db.from("invoices").select("invoice_seq").not("invoice_seq", "is", null).order("invoice_seq", { ascending: false }).limit(1));
  return (r[0]?.invoice_seq ?? 0) + 1;
}

/** Nummer und QR-Referenz vergeben (falls noch nicht vorhanden). */
async function ensureNumber(db: Db, inv: { id: string; client_id: string | null; invoice_number: string | null; invoice_seq: number | null; qr_reference: string | null }) {
  if (inv.invoice_number && inv.qr_reference) return;
  if (!inv.client_id) throw new Error("Rechnung hat keinen Kunden");
  const kd = await customerNumber(db, inv.client_id);
  const seq = inv.invoice_seq ?? (await nextSeq(db));
  check(await db.from("invoices").update({ invoice_seq: seq, invoice_number: `KD-${kd}-${seq}`, qr_reference: qrReference(kd, seq) }).eq("id", inv.id));
}

/** Nettobetrag/MWST aus den Positionen neu berechnen. */
async function recompute(db: Db, id: string) {
  const inv = check<{ vat_rate: number }>(await db.from("invoices").select("vat_rate").eq("id", id).single());
  const items = check<Array<{ quantity: number; unit_price: number }>>(await db.from("invoice_items").select("quantity, unit_price").eq("invoice_id", id));
  const net = items.reduce((s, i) => s + Math.round(Number(i.quantity) * Number(i.unit_price)), 0);
  check(await db.from("invoices").update({ amount: net, vat: vatOf(net, Number(inv.vat_rate ?? VAT)) }).eq("id", id));
}

/* ---- Monatsrechnungen ---------------------------------------------------------- */

/**
 * Erstellt fuer alle aktiven Vertraege einen Rechnungsentwurf fuer die Periode
 * (YYYY-MM). Positionen = wiederkehrende Vertragspositionen, sonst Monatswert.
 * Bereits vorhandene Rechnungen derselben Periode werden uebersprungen.
 */
export async function createMonthlyInvoicesAction(period: string, issueDate: string): Promise<Result> {
  try {
    const { db, user } = await guard();
    const p = z.string().regex(/^\d{4}-\d{2}$/).parse(period);
    const issue = isoDate.parse(issueDate);
    const from = `${p}-01`;
    const [y, m] = p.split("-").map(Number) as [number, number];
    const to = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    const contracts = check<Array<{ id: string; client_id: string; title: string; value_monthly: number | null; payment_days: number | null; start_date: string | null; end_date: string | null }>>(
      await db.from("contracts").select("id, client_id, title, value_monthly, payment_days, start_date, end_date").eq("status", "active").is("deleted_at", null),
    );
    const existing = check<Array<{ contract_id: string }>>(await db.from("invoices").select("contract_id").eq("period_from", from).is("deleted_at", null).not("contract_id", "is", null));
    const done = new Set(existing.map((e) => e.contract_id));
    let created = 0;
    let skipped = 0;
    for (const c of contracts) {
      // Nur Vertraege, die in der Periode laufen
      if (done.has(c.id) || (c.start_date && c.start_date > to) || (c.end_date && c.end_date < from)) {
        skipped++;
        continue;
      }
      const items = check<Array<{ description: string; detail: string | null; quantity: number; unit_price: number }>>(
        await db.from("document_items").select("description, detail, quantity, unit_price").eq("contract_id", c.id).eq("recurring", true).order("sort_order"),
      );
      const rows = items.length ? items : c.value_monthly ? [{ description: c.title, detail: null, quantity: 1, unit_price: c.value_monthly }] : [];
      if (!rows.length) {
        skipped++;
        continue;
      }
      const net = rows.reduce((s, i) => s + Math.round(Number(i.quantity) * Number(i.unit_price)), 0);
      const inv = check<{ id: string; client_id: string; invoice_number: string | null; invoice_seq: number | null; qr_reference: string | null }>(
        await db
          .from("invoices")
          .insert({
            client_id: c.client_id,
            contract_id: c.id,
            title: `Monatsrechnung ${new Intl.DateTimeFormat("de-CH", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${from}T12:00:00Z`))}`,
            status: "draft",
            issue_date: issue,
            due_date: addDays(issue, c.payment_days ?? 7),
            period_from: from,
            period_to: to,
            vat_rate: VAT,
            amount: net,
            vat: vatOf(net, VAT),
            created_by: user.id,
          })
          .select("id, client_id, invoice_number, invoice_seq, qr_reference")
          .single(),
      );
      check(
        await db.from("invoice_items").insert(
          rows.map((r, i) => ({ invoice_id: inv.id, position: i + 1, title: r.description, description: r.detail, quantity: Number(r.quantity), unit_price: Number(r.unit_price) })),
        ),
      );
      await ensureNumber(db, inv);
      created++;
    }
    await recordAudit({ action: "invoices.monthly", entityType: "invoice", entityId: null, newValues: { period: p, created, skipped } });
    refresh();
    return { ok: true, message: created ? `${created} Entwürfe für ${p} erstellt${skipped ? `, ${skipped} übersprungen (bereits vorhanden oder ohne Betrag)` : ""}` : "Keine neuen Rechnungen: alle aktiven Verträge sind für diese Periode bereits verrechnet." };
  } catch (e) {
    return fail(e);
  }
}

/** Einzelrechnung: leerer Entwurf fuer einen Kunden, Positionen im Editor. */
export async function createSingleInvoiceAction(clientId: string, title: string): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const { db, user } = await guard();
    uuid.parse(clientId);
    const t = z.string().trim().min(1).max(200).parse(title);
    const issue = new Date().toISOString().slice(0, 10);
    const inv = check<{ id: string }>(
      await db
        .from("invoices")
        .insert({ client_id: clientId, title: t, status: "draft", issue_date: issue, due_date: addDays(issue, 30), vat_rate: VAT, amount: 0, vat: 0, created_by: user.id })
        .select("id")
        .single(),
    );
    check(await db.from("invoice_items").insert({ invoice_id: inv.id, position: 1, title: t, quantity: 1, unit_price: 0 }));
    refresh();
    return { ok: true, id: inv.id };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Entwurf bearbeiten ---------------------------------------------------------- */

const itemSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().max(2000).nullable(),
  quantity: z.number().positive().max(100000),
  unit_price: z.number().int().min(0),
});

export async function saveDraftAction(
  id: string,
  input: { issue_date: string; due_date: string; period_from: string | null; period_to: string | null; notes: string | null; items: Array<z.input<typeof itemSchema>> },
): Promise<Result> {
  try {
    const { db } = await guard();
    uuid.parse(id);
    const inv = check<{ status: string }>(await db.from("invoices").select("status").eq("id", id).single());
    if (inv.status !== "draft") throw new Error("Nur Entwürfe können bearbeitet werden");
    const items = z.array(itemSchema).min(1).parse(input.items);
    check(
      await db
        .from("invoices")
        .update({ issue_date: isoDate.parse(input.issue_date), due_date: isoDate.parse(input.due_date), period_from: input.period_from ? isoDate.parse(input.period_from) : null, period_to: input.period_to ? isoDate.parse(input.period_to) : null, notes: input.notes?.trim() || null })
        .eq("id", id),
    );
    check(await db.from("invoice_items").delete().eq("invoice_id", id));
    check(await db.from("invoice_items").insert(items.map((it, i) => ({ ...it, invoice_id: id, position: i + 1 }))));
    await recompute(db, id);
    refresh(id);
    return { ok: true, message: "Entwurf gespeichert" };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Status ---------------------------------------------------------------------- */

/** Entwuerfe freigeben (Status offen). Vergibt fehlende Nummer und QR-Referenz. */
export async function releaseInvoicesAction(ids: string[]): Promise<Result> {
  try {
    const { db } = await guard();
    const list = z.array(uuid).min(1).max(200).parse(ids);
    const rows = check<Array<{ id: string; status: string; client_id: string | null; invoice_number: string | null; invoice_seq: number | null; qr_reference: string | null; issue_date: string | null; due_date: string | null }>>(
      await db.from("invoices").select("id, status, client_id, invoice_number, invoice_seq, qr_reference, issue_date, due_date").in("id", list),
    );
    let n = 0;
    for (const r of rows.filter((x) => x.status === "draft")) {
      await ensureNumber(db, r);
      const issue = r.issue_date ?? new Date().toISOString().slice(0, 10);
      check(await db.from("invoices").update({ status: "open", issue_date: issue, due_date: r.due_date ?? addDays(issue, 7) }).eq("id", r.id));
      n++;
    }
    await recordAudit({ action: "invoices.release", entityType: "invoice", entityId: null, newValues: { ids: list, released: n } });
    refresh(list.length === 1 ? list[0] : undefined);
    return { ok: true, message: `${n} Rechnung${n === 1 ? "" : "en"} freigegeben` };
  } catch (e) {
    return fail(e);
  }
}

export async function markSentAction(id: string): Promise<Result> {
  try {
    const { db } = await guard();
    uuid.parse(id);
    check(await db.from("invoices").update({ sent_at: new Date().toISOString() }).eq("id", id));
    refresh(id);
    return { ok: true, message: "Als versendet markiert" };
  } catch (e) {
    return fail(e);
  }
}

export async function remindAction(id: string): Promise<Result> {
  try {
    const { db } = await guard();
    uuid.parse(id);
    const r = check<{ reminder_stage: number }>(await db.from("invoices").select("reminder_stage").eq("id", id).single());
    const stage = Math.min(3, (r.reminder_stage ?? 0) + 1);
    check(await db.from("invoices").update({ reminder_stage: stage, last_reminder_at: new Date().toISOString() }).eq("id", id));
    await recordAudit({ action: "invoice.reminder", entityType: "invoice", entityId: id, newValues: { reminder_stage: stage } });
    refresh(id);
    return { ok: true, message: `Mahnstufe ${stage} vermerkt` };
  } catch (e) {
    return fail(e);
  }
}

export async function cancelInvoiceAction(id: string): Promise<Result> {
  try {
    const { db } = await guard();
    uuid.parse(id);
    const r = check<{ status: string }>(await db.from("invoices").select("status").eq("id", id).single());
    if (r.status === "draft") {
      // Entwurf: verwerfen (weich geloescht, Nummer bleibt reserviert)
      check(await db.from("invoices").update({ deleted_at: new Date().toISOString() }).eq("id", id));
      refresh();
      return { ok: true, message: "Entwurf verworfen" };
    }
    check(await db.from("invoices").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", id));
    await recordAudit({ action: "invoice.cancel", entityType: "invoice", entityId: id });
    refresh(id);
    return { ok: true, message: "Rechnung storniert" };
  } catch (e) {
    return fail(e);
  }
}

/* ---- Zahlungen ------------------------------------------------------------------- */

async function settle(db: Db, id: string) {
  const inv = check<{ amount: number; vat: number; status: string }>(await db.from("invoices").select("amount, vat, status").eq("id", id).single());
  const pays = check<Array<{ amount: number; paid_on: string }>>(await db.from("invoice_payments").select("amount, paid_on").eq("invoice_id", id));
  const paid = pays.reduce((s, p) => s + Number(p.amount), 0);
  const total = Number(inv.amount ?? 0) + Number(inv.vat ?? 0);
  if (paid >= total && inv.status !== "cancelled") {
    const last = pays.map((p) => p.paid_on).sort().at(-1) ?? null;
    check(await db.from("invoices").update({ status: "paid", paid_date: last }).eq("id", id));
  } else if (inv.status === "paid" && paid < total) {
    check(await db.from("invoices").update({ status: "open", paid_date: null }).eq("id", id));
  }
}

export async function recordPaymentAction(id: string, amountRappen: number, paidOn: string, note: string | null): Promise<Result> {
  try {
    const { db, user } = await guard();
    uuid.parse(id);
    const amount = z.number().int().positive().parse(amountRappen);
    check(await db.from("invoice_payments").insert({ invoice_id: id, amount, paid_on: isoDate.parse(paidOn), source: "manual", note: note?.trim() || null, created_by: user.id }));
    await settle(db, id);
    await recordAudit({ action: "invoice.payment", entityType: "invoice", entityId: id, newValues: { amount, paidOn } });
    refresh(id);
    return { ok: true, message: "Zahlung erfasst" };
  } catch (e) {
    return fail(e);
  }
}

export async function deletePaymentAction(invoiceId: string, paymentId: string): Promise<Result> {
  try {
    const { db } = await guard();
    uuid.parse(paymentId);
    check(await db.from("invoice_payments").delete().eq("id", paymentId).eq("invoice_id", invoiceId));
    await settle(db, invoiceId);
    refresh(invoiceId);
    return { ok: true, message: "Zahlung entfernt" };
  } catch (e) {
    return fail(e);
  }
}

const bankEntry = z.object({
  id: z.string().min(1).max(200),
  reference: z.string().regex(/^\d{27}$/),
  amount: z.number().int().positive(),
  date: isoDate,
});

/**
 * Zahlungseingaenge aus einem Kontoauszug (camt.053/054) verbuchen: Zuordnung
 * ueber die QR-Referenz, doppelte Buchungen (gleiche Bank-ID) werden ignoriert.
 */
export async function bookBankEntriesAction(entries: Array<z.input<typeof bankEntry>>): Promise<Result> {
  try {
    const { db, user } = await guard();
    const list = z.array(bankEntry).max(2000).parse(entries);
    const refs = [...new Set(list.map((e) => e.reference))];
    const invs = check<Array<{ id: string; qr_reference: string }>>(await db.from("invoices").select("id, qr_reference").in("qr_reference", refs).is("deleted_at", null));
    const byRef = new Map(invs.map((i) => [i.qr_reference, i.id]));
    let booked = 0;
    let dup = 0;
    let unmatched = 0;
    const touched = new Set<string>();
    for (const e of list) {
      const inv = byRef.get(e.reference);
      if (!inv) {
        unmatched++;
        continue;
      }
      const r = await db.from("invoice_payments").insert({ invoice_id: inv, amount: e.amount, paid_on: e.date, source: "camt", reference: e.reference, bank_entry: e.id, created_by: user.id });
      if (r.error) {
        if (/duplicate|unique/i.test(r.error.message)) dup++;
        else throw new Error(r.error.message);
        continue;
      }
      booked++;
      touched.add(inv);
    }
    for (const id of touched) await settle(db, id);
    await recordAudit({ action: "invoices.bank_import", entityType: "invoice", entityId: null, newValues: { booked, dup, unmatched } });
    refresh();
    return { ok: true, message: `${booked} verbucht, ${dup} bereits erfasst, ${unmatched} ohne passende Rechnung` };
  } catch (e) {
    return fail(e);
  }
}
