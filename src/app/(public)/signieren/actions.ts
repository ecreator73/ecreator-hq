"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientMeta, notifyRoles, rateLimit, type PublicResult } from "@/lib/public-forms";
import { loadSignDocument, parseKind } from "@/server/services/sign-documents";

/**
 * Offerte/Vertrag verbindlich unterschreiben (einfache elektronische
 * Unterschrift): Name, gezeichnete Unterschrift, Zeitpunkt, IP und Browser
 * werden als Nachweis gespeichert. Danach ist das Dokument gesperrt.
 */
export async function signDocumentAction(input: { kind: string; token: string; name: string; signature: string; accept: boolean }): Promise<PublicResult> {
  try {
    const v = z
      .object({
        kind: z.string(),
        token: z.string().min(20).max(100),
        name: z.string().trim().min(2, "Bitte Vor- und Nachnamen angeben").max(120),
        signature: z.string().regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/, "Bitte im Feld unterschreiben").max(300_000, "Unterschrift zu gross, bitte neu zeichnen"),
        accept: z.literal(true, { errorMap: () => ({ message: "Bitte bestätigen" }) }),
      })
      .parse(input);
    const kind = parseKind(v.kind);
    if (!kind) throw new Error("Dokument nicht gefunden");
    await rateLimit("document_sign", 10, 60);
    const doc = await loadSignDocument(kind, v.token);
    if (!doc) throw new Error("Dokument nicht gefunden");
    if (doc.signedAt) throw new Error("Dieses Dokument wurde bereits unterschrieben.");
    if (doc.expired) throw new Error("Die Offerte ist abgelaufen. Bitte kontaktieren Sie uns für eine neue Offerte.");
    if (doc.status === "cancelled" || doc.status === "rejected") throw new Error("Dieses Dokument ist nicht mehr gültig.");

    const meta = await clientMeta();
    const now = new Date().toISOString();
    const db = createAdminClient();
    const base = { signed_at: now, signed_name: v.name, signature_data: v.signature, signed_ip: meta.ip, signed_user_agent: meta.userAgent };
    const patch =
      kind === "offer"
        ? { ...base, status: "accepted", accepted_date: now.slice(0, 10) }
        : { ...base, ...(doc.status === "draft" ? { status: "active" } : {}) };
    // Nur unterschreiben, wenn noch nicht unterschrieben (gegen Doppelklicks)
    const { data, error } = await db.from(kind === "offer" ? "offers" : "contracts").update(patch).eq("id", doc.id).is("signed_at", null).select("id");
    if (error) throw new Error("Unterschrift konnte nicht gespeichert werden. Bitte erneut versuchen.");
    if (!data?.length) throw new Error("Dieses Dokument wurde bereits unterschrieben.");
    await notifyRoles(["super_admin", "ceo", "cso", "sales", "finance"], {
      type: "document_signed",
      title: `${kind === "offer" ? "Offerte" : "Vertrag"} unterschrieben: ${doc.client.name}`,
      body: `${doc.title}${doc.number ? ` (${doc.number})` : ""} von ${v.name}`,
      entityType: kind,
      entityId: doc.id,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof z.ZodError ? e.issues[0]?.message ?? "Bitte Angaben prüfen" : e instanceof Error ? e.message : "Unbekannter Fehler" };
  }
}
