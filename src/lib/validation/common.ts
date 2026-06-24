import { z } from "zod";

/**
 * Gemeinsame Zod-Bausteine fuer alle Entitaets-Schemas.
 * Leere Strings werden zu `null` normalisiert (Formular-freundlich).
 */

const emptyToNull = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    schema.nullable(),
  );

/** Pflicht-Text (getrimmt, 1..max Zeichen). */
export const requiredText = (max = 500) =>
  z.string().trim().min(1, "Pflichtfeld").max(max);

/** Optionaler Freitext (leer -> null). */
export const optionalText = (max = 10000) =>
  emptyToNull(z.string().trim().max(max));

export const optionalEmail = emptyToNull(
  z.string().trim().email("Ungueltige E-Mail").max(320),
);

export const optionalUrl = emptyToNull(
  z.string().trim().url("Ungueltige URL").max(2048),
);

export const uuid = z.string().uuid("Ungueltige ID");
export const optionalUuid = emptyToNull(z.string().uuid("Ungueltige ID"));

/** Datum ohne Zeit im Format YYYY-MM-DD (leer -> null). */
export const optionalDate = emptyToNull(
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum im Format YYYY-MM-DD"),
);

/** Zeitstempel (ISO 8601, leer -> null). */
export const optionalDateTime = emptyToNull(z.string().datetime({ offset: true }));

/** Geldbetrag als Ganzzahl in Rappen (>= 0, leer/null erlaubt). */
export const optionalRappen = emptyToNull(
  z.number().int("Betrag in Rappen (Ganzzahl)").min(0),
);

/**
 * Waehrung (ISO 4217). Leerer String / null / undefined -> Feld wird ausgelassen,
 * sodass der DB-Default ('CHF') greift, statt eine Laengen-Validierung zu werfen.
 */
export const currency = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z.string().trim().length(3).optional(),
);

export const optionalBoolean = z.boolean().optional();

/** Ganzzahl >= 0 (z.B. Kuendigungsfrist in Tagen). */
export const optionalNonNegativeInt = emptyToNull(z.number().int().min(0));

/** Dateigroesse in Bytes (DB: bigint). Begrenzt auf sicheren JS-Ganzzahlbereich. */
export const optionalByteSize = emptyToNull(
  z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
);

/** Stundenangabe (Dezimal, >= 0), leer -> null. */
export const optionalHours = emptyToNull(z.number().min(0).max(100000));

/**
 * Optionaler Enum-Wert: leerer String / null / undefined -> Feld wird ausgelassen
 * (DB-Default greift), sonst muss der Wert in `values` enthalten sein.
 */
export const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.enum(values).optional(),
  );

/** Liste von Tags (nicht-leere Strings), leer/undefined -> []. */
export const optionalTags = z.preprocess(
  (v) => (Array.isArray(v) ? v : []),
  z.array(z.string().trim().min(1).max(50)).max(50),
);
