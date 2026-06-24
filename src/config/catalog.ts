/**
 * Zentrale Registry-Spiegelung (TypeScript-Seite).
 *
 * Diese Datei spiegelt den DB-Seed aus `supabase/migrations/0002_*` (Tabellen
 * `statuses` / `priorities`) sowie die fachlichen Typ-Enums. Sie ist die
 * EINZIGE Quelle fuer Status-/Typ-Schluessel im Code - keine hardcodierten
 * Statuswerte verstreut in Komponenten oder Services.
 *
 * DB-Wert (`key`) ist immer englisch/snake_case; `label` ist die deutsche
 * UI-Beschriftung.
 */

export type StatusColor = "green" | "amber" | "red" | "blue" | "gray";

export interface CatalogEntry<K extends string = string> {
  key: K;
  label: string;
  color: StatusColor;
  isDefault?: boolean;
}

function buildMap<const T extends readonly CatalogEntry[]>(
  entries: T,
): Record<T[number]["key"], CatalogEntry> {
  return Object.fromEntries(entries.map((e) => [e.key, e])) as Record<
    T[number]["key"],
    CatalogEntry
  >;
}

function keysOf<const T extends readonly CatalogEntry[]>(
  entries: T,
): [T[number]["key"], ...T[number]["key"][]] {
  return entries.map((e) => e.key) as [
    T[number]["key"],
    ...T[number]["key"][],
  ];
}

/* --------------------------------------------------------------------------
 * Status-Werte je Entitaet
 * ------------------------------------------------------------------------ */

export const CLIENT_STATUSES = [
  { key: "active", label: "Aktiv", color: "green" },
  { key: "onboarding", label: "Onboarding", color: "blue", isDefault: true },
  { key: "paused", label: "Pausiert", color: "amber" },
  { key: "ended", label: "Beendet", color: "gray" },
] as const satisfies readonly CatalogEntry[];

export const PROJECT_STATUSES = [
  { key: "planned", label: "Geplant", color: "gray", isDefault: true },
  { key: "active", label: "Aktiv", color: "green" },
  { key: "on_hold", label: "Pausiert", color: "amber" },
  { key: "completed", label: "Abgeschlossen", color: "blue" },
  { key: "cancelled", label: "Abgebrochen", color: "red" },
] as const satisfies readonly CatalogEntry[];

export const OFFER_STATUSES = [
  { key: "draft", label: "Entwurf", color: "gray", isDefault: true },
  { key: "sent", label: "Gesendet", color: "blue" },
  { key: "accepted", label: "Akzeptiert", color: "green" },
  { key: "rejected", label: "Abgelehnt", color: "red" },
  { key: "expired", label: "Abgelaufen", color: "amber" },
] as const satisfies readonly CatalogEntry[];

export const CONTRACT_STATUSES = [
  { key: "draft", label: "Entwurf", color: "gray", isDefault: true },
  { key: "active", label: "Aktiv", color: "green" },
  { key: "expired", label: "Abgelaufen", color: "amber" },
  { key: "cancelled", label: "Gekuendigt", color: "red" },
] as const satisfies readonly CatalogEntry[];

export const TASK_STATUSES = [
  { key: "open", label: "Offen", color: "gray", isDefault: true },
  { key: "in_progress", label: "In Arbeit", color: "blue" },
  { key: "waiting_client", label: "Wartet auf Kunde", color: "amber" },
  { key: "review", label: "Intern Review", color: "blue" },
  { key: "blocked", label: "Blockiert", color: "red" },
  { key: "done", label: "Erledigt", color: "green" },
  { key: "archived", label: "Archiviert", color: "gray" },
] as const satisfies readonly CatalogEntry[];

export const LEAD_STATUSES = [
  { key: "new", label: "Neu", color: "gray", isDefault: true },
  { key: "contacted", label: "Kontaktiert", color: "blue" },
  { key: "interested", label: "Interesse", color: "blue" },
  { key: "meeting_booked", label: "Termin gebucht", color: "blue" },
  { key: "offer_created", label: "Angebot erstellt", color: "amber" },
  { key: "offer_sent", label: "Angebot gesendet", color: "amber" },
  { key: "negotiation", label: "Verhandlung", color: "amber" },
  { key: "won", label: "Gewonnen", color: "green" },
  { key: "lost", label: "Verloren", color: "red" },
  { key: "paused", label: "Pausiert", color: "gray" },
] as const satisfies readonly CatalogEntry[];

export const MEETING_STATUSES = [
  { key: "planned", label: "Geplant", color: "gray", isDefault: true },
  { key: "completed", label: "Durchgefuehrt", color: "green" },
  { key: "cancelled", label: "Abgesagt", color: "red" },
  { key: "rescheduled", label: "Verschoben", color: "amber" },
] as const satisfies readonly CatalogEntry[];

export const REPORTING_CALL_STATUSES = [
  { key: "open", label: "Offen", color: "gray", isDefault: true },
  { key: "scheduled", label: "Geplant", color: "blue" },
  { key: "completed", label: "Durchgefuehrt", color: "green" },
  { key: "rescheduled", label: "Verschoben", color: "amber" },
  { key: "cancelled", label: "Abgesagt", color: "red" },
] as const satisfies readonly CatalogEntry[];

/* Phase 6 - Produktions-Status je spezialisierter Projektart */
export const WEBSITE_PROJECT_STATUSES = [
  { key: "strategy", label: "Strategie", color: "gray", isDefault: true },
  { key: "sitemap", label: "Sitemap", color: "gray" },
  { key: "design", label: "Design", color: "blue" },
  { key: "development", label: "Entwicklung", color: "blue" },
  { key: "content", label: "Content", color: "blue" },
  { key: "seo", label: "SEO", color: "amber" },
  { key: "tracking", label: "Tracking", color: "amber" },
  { key: "review", label: "Review", color: "amber" },
  { key: "launch", label: "Launch", color: "green" },
  { key: "maintenance", label: "Wartung", color: "blue" },
  { key: "completed", label: "Abgeschlossen", color: "green" },
] as const satisfies readonly CatalogEntry[];

export const AD_PROJECT_STATUSES = [
  { key: "setup", label: "Setup", color: "gray", isDefault: true },
  { key: "tracking", label: "Tracking", color: "gray" },
  { key: "creative", label: "Creative Produktion", color: "blue" },
  { key: "review", label: "Review", color: "amber" },
  { key: "live", label: "Live", color: "green" },
  { key: "optimization", label: "Optimierung", color: "blue" },
  { key: "scaling", label: "Skalierung", color: "green" },
  { key: "paused", label: "Pausiert", color: "amber" },
] as const satisfies readonly CatalogEntry[];

export const CRM_PROJECT_STATUSES = [
  { key: "analysis", label: "Analyse", color: "gray", isDefault: true },
  { key: "workflow_mapping", label: "Workflow Mapping", color: "gray" },
  { key: "data_model", label: "Datenmodell", color: "blue" },
  { key: "ui_build", label: "UI Aufbau", color: "blue" },
  { key: "automations", label: "Automationen", color: "blue" },
  { key: "integrations", label: "Integrationen", color: "blue" },
  { key: "testing", label: "Testing", color: "amber" },
  { key: "training", label: "Schulung", color: "amber" },
  { key: "live", label: "Live", color: "green" },
  { key: "maintenance", label: "Wartung", color: "blue" },
] as const satisfies readonly CatalogEntry[];

export const CONTENT_PROJECT_STATUSES = [
  { key: "idea", label: "Idee", color: "gray", isDefault: true },
  { key: "planning", label: "Planung", color: "gray" },
  { key: "script", label: "Skript", color: "blue" },
  { key: "shoot_planned", label: "Dreh geplant", color: "blue" },
  { key: "filmed", label: "Gefilmt", color: "blue" },
  { key: "editing", label: "Schnitt", color: "amber" },
  { key: "review", label: "Review", color: "amber" },
  { key: "approved", label: "Freigegeben", color: "green" },
  { key: "published", label: "Veroeffentlicht", color: "green" },
] as const satisfies readonly CatalogEntry[];

export const SHOOT_STATUSES = [
  { key: "planned", label: "Geplant", color: "gray", isDefault: true },
  { key: "confirmed", label: "Bestaetigt", color: "blue" },
  { key: "done", label: "Durchgefuehrt", color: "green" },
  { key: "rescheduled", label: "Verschoben", color: "amber" },
  { key: "cancelled", label: "Abgesagt", color: "red" },
] as const satisfies readonly CatalogEntry[];

export const APPROVAL_STATUSES = [
  { key: "open", label: "Offen", color: "amber", isDefault: true },
  { key: "approved", label: "Freigegeben", color: "green" },
  { key: "rejected", label: "Abgelehnt", color: "red" },
] as const satisfies readonly CatalogEntry[];

export const WEBSITE_PROJECT_STATUS_KEYS = keysOf(WEBSITE_PROJECT_STATUSES);
export const AD_PROJECT_STATUS_KEYS = keysOf(AD_PROJECT_STATUSES);
export const CRM_PROJECT_STATUS_KEYS = keysOf(CRM_PROJECT_STATUSES);
export const CONTENT_PROJECT_STATUS_KEYS = keysOf(CONTENT_PROJECT_STATUSES);
export const SHOOT_STATUS_KEYS = keysOf(SHOOT_STATUSES);
export const APPROVAL_STATUS_KEYS = keysOf(APPROVAL_STATUSES);

export type WebsiteProjectStatus = (typeof WEBSITE_PROJECT_STATUS_KEYS)[number];
export type AdProjectStatus = (typeof AD_PROJECT_STATUS_KEYS)[number];
export type CrmProjectStatus = (typeof CRM_PROJECT_STATUS_KEYS)[number];
export type ContentProjectStatus = (typeof CONTENT_PROJECT_STATUS_KEYS)[number];
export type ShootStatus = (typeof SHOOT_STATUS_KEYS)[number];
export type ApprovalStatus = (typeof APPROVAL_STATUS_KEYS)[number];

/* Phase 13 - Proposal (Registry-Status) */
export const PROPOSAL_STATUSES = [
  { key: "draft", label: "Entwurf", color: "gray", isDefault: true },
  { key: "review", label: "Bereit zur Pruefung", color: "amber" },
  { key: "sent", label: "Gesendet", color: "blue" },
  { key: "accepted", label: "Akzeptiert", color: "green" },
  { key: "rejected", label: "Abgelehnt", color: "red" },
  { key: "archived", label: "Archiviert", color: "gray" },
] as const satisfies readonly CatalogEntry[];
export const PROPOSAL_STATUS_KEYS = keysOf(PROPOSAL_STATUSES);
export type ProposalStatus = (typeof PROPOSAL_STATUS_KEYS)[number];

/* Phase 11 - Outreach (Registry-Status) */
export const OUTREACH_MESSAGE_STATUSES = [
  { key: "draft", label: "Entwurf", color: "gray", isDefault: true },
  { key: "scheduled", label: "Geplant", color: "blue" },
  { key: "sent", label: "Gesendet", color: "blue" },
  { key: "opened", label: "Geoeffnet", color: "amber" },
  { key: "replied", label: "Beantwortet", color: "amber" },
  { key: "positive", label: "Positiv", color: "green" },
  { key: "negative", label: "Negativ", color: "red" },
  { key: "no_interest", label: "Kein Interesse", color: "gray" },
] as const satisfies readonly CatalogEntry[];
export const BOOKED_MEETING_STATUSES = [
  { key: "requested", label: "Angefragt", color: "amber", isDefault: true },
  { key: "confirmed", label: "Bestaetigt", color: "green" },
  { key: "done", label: "Durchgefuehrt", color: "blue" },
  { key: "cancelled", label: "Abgesagt", color: "red" },
] as const satisfies readonly CatalogEntry[];
export const OUTREACH_MESSAGE_STATUS_KEYS = keysOf(OUTREACH_MESSAGE_STATUSES);
export const BOOKED_MEETING_STATUS_KEYS = keysOf(BOOKED_MEETING_STATUSES);
export type OutreachMessageStatus = (typeof OUTREACH_MESSAGE_STATUS_KEYS)[number];
export type BookedMeetingStatus = (typeof BOOKED_MEETING_STATUS_KEYS)[number];
/** Outreach-Pipeline-Spalten (Nachrichten-Status, ohne negative/no_interest). */
export const OUTREACH_PIPELINE_KEYS = OUTREACH_MESSAGE_STATUSES.filter(
  (s) => !["negative", "no_interest"].includes(s.key),
).map((s) => s.key) as Exclude<
  (typeof OUTREACH_MESSAGE_STATUS_KEYS)[number],
  "negative" | "no_interest"
>[];

/* Phase 8 - Finance */
export const INVOICE_STATUSES = [
  { key: "draft", label: "Entwurf", color: "gray", isDefault: true },
  { key: "open", label: "Offen", color: "blue" },
  { key: "paid", label: "Bezahlt", color: "green" },
  { key: "overdue", label: "Ueberfaellig", color: "red" },
  { key: "cancelled", label: "Storniert", color: "gray" },
] as const satisfies readonly CatalogEntry[];
export const INVOICE_STATUS_KEYS = keysOf(INVOICE_STATUSES);
export type InvoiceStatus = (typeof INVOICE_STATUS_KEYS)[number];

/* Phase 7 - Creator Pool */
export const CREATOR_STATUSES = [
  { key: "new", label: "Neu", color: "gray", isDefault: true },
  { key: "contacted", label: "Kontaktiert", color: "blue" },
  { key: "interested", label: "Interesse", color: "blue" },
  { key: "qualified", label: "Qualifiziert", color: "amber" },
  { key: "pool", label: "Creator Pool", color: "green" },
  { key: "active", label: "Aktiv", color: "green" },
  { key: "inactive", label: "Inaktiv", color: "gray" },
  { key: "unsuitable", label: "Nicht geeignet", color: "red" },
] as const satisfies readonly CatalogEntry[];

export const SHOOT_ASSIGNMENT_STATUSES = [
  { key: "requested", label: "Angefragt", color: "amber", isDefault: true },
  { key: "confirmed", label: "Bestaetigt", color: "green" },
  { key: "rejected", label: "Abgelehnt", color: "red" },
  { key: "done", label: "Durchgefuehrt", color: "blue" },
] as const satisfies readonly CatalogEntry[];

export const CREATOR_STATUS_KEYS = keysOf(CREATOR_STATUSES);
export const SHOOT_ASSIGNMENT_STATUS_KEYS = keysOf(SHOOT_ASSIGNMENT_STATUSES);
export type CreatorStatus = (typeof CREATOR_STATUS_KEYS)[number];
export type ShootAssignmentStatus = (typeof SHOOT_ASSIGNMENT_STATUS_KEYS)[number];

/** Pipeline-Spalten (alle Creator-Status ausser inaktiv / nicht geeignet). */
export const CREATOR_PIPELINE_KEYS = CREATOR_STATUSES.filter(
  (s) => s.key !== "inactive" && s.key !== "unsuitable",
).map((s) => s.key) as Exclude<
  (typeof CREATOR_STATUS_KEYS)[number],
  "inactive" | "unsuitable"
>[];

export const CLIENT_STATUS_KEYS = keysOf(CLIENT_STATUSES);
export const PROJECT_STATUS_KEYS = keysOf(PROJECT_STATUSES);
export const OFFER_STATUS_KEYS = keysOf(OFFER_STATUSES);
export const CONTRACT_STATUS_KEYS = keysOf(CONTRACT_STATUSES);
export const TASK_STATUS_KEYS = keysOf(TASK_STATUSES);
export const LEAD_STATUS_KEYS = keysOf(LEAD_STATUSES);
export const MEETING_STATUS_KEYS = keysOf(MEETING_STATUSES);
export const REPORTING_CALL_STATUS_KEYS = keysOf(REPORTING_CALL_STATUSES);

/** Pipeline-Spalten (alle Lead-Status ausser "paused"). */
export const LEAD_PIPELINE_KEYS = LEAD_STATUSES.filter(
  (s) => s.key !== "paused",
).map((s) => s.key) as Exclude<
  (typeof LEAD_STATUS_KEYS)[number],
  "paused"
>[];

/** Spalten der Kanban-Ansicht (alle Task-Status ausser "archived"). */
export const BOARD_STATUS_KEYS = TASK_STATUSES.filter(
  (s) => s.key !== "archived",
).map((s) => s.key) as Exclude<
  (typeof TASK_STATUS_KEYS)[number],
  "archived"
>[];

export type ClientStatus = (typeof CLIENT_STATUS_KEYS)[number];
export type ProjectStatus = (typeof PROJECT_STATUS_KEYS)[number];
export type OfferStatus = (typeof OFFER_STATUS_KEYS)[number];
export type ContractStatus = (typeof CONTRACT_STATUS_KEYS)[number];
export type TaskStatus = (typeof TASK_STATUS_KEYS)[number];
export type LeadStatus = (typeof LEAD_STATUS_KEYS)[number];
export type MeetingStatus = (typeof MEETING_STATUS_KEYS)[number];
export type ReportingCallStatus = (typeof REPORTING_CALL_STATUS_KEYS)[number];

/** Registry je Entitaetstyp - fuer generische Label-Aufloesung. */
export const STATUS_REGISTRY = {
  client: buildMap(CLIENT_STATUSES),
  project: buildMap(PROJECT_STATUSES),
  offer: buildMap(OFFER_STATUSES),
  contract: buildMap(CONTRACT_STATUSES),
  task: buildMap(TASK_STATUSES),
  lead: buildMap(LEAD_STATUSES),
  meeting: buildMap(MEETING_STATUSES),
  reporting_call: buildMap(REPORTING_CALL_STATUSES),
  website_project: buildMap(WEBSITE_PROJECT_STATUSES),
  ad_project: buildMap(AD_PROJECT_STATUSES),
  crm_project: buildMap(CRM_PROJECT_STATUSES),
  content_project: buildMap(CONTENT_PROJECT_STATUSES),
  shoot: buildMap(SHOOT_STATUSES),
  approval: buildMap(APPROVAL_STATUSES),
  creator: buildMap(CREATOR_STATUSES),
  shoot_assignment: buildMap(SHOOT_ASSIGNMENT_STATUSES),
  invoice: buildMap(INVOICE_STATUSES),
  outreach_message: buildMap(OUTREACH_MESSAGE_STATUSES),
  booked_meeting: buildMap(BOOKED_MEETING_STATUSES),
  proposal: buildMap(PROPOSAL_STATUSES),
} as const;

export type StatusEntity = keyof typeof STATUS_REGISTRY;

/** Deutsche Beschriftung fuer einen Status-Key (mit Fallback). */
export function statusLabel(entity: StatusEntity, key: string | null): string {
  if (!key) return "-";
  const map = STATUS_REGISTRY[entity] as Record<string, CatalogEntry>;
  return map[key]?.label ?? key;
}

/* --------------------------------------------------------------------------
 * Prioritaeten (projects, spaeter tasks)
 * ------------------------------------------------------------------------ */

export const PRIORITIES = [
  { key: "low", label: "Niedrig", color: "gray" },
  { key: "medium", label: "Mittel", color: "blue", isDefault: true },
  { key: "high", label: "Hoch", color: "amber" },
  { key: "urgent", label: "Kritisch", color: "red" },
] as const satisfies readonly CatalogEntry[];

export const PRIORITY_KEYS = keysOf(PRIORITIES);
export type Priority = (typeof PRIORITY_KEYS)[number];
export const PRIORITY_MAP = buildMap(PRIORITIES);

export function priorityLabel(key: string | null): string {
  if (!key) return "-";
  return PRIORITY_MAP[key as Priority]?.label ?? key;
}

/* --------------------------------------------------------------------------
 * Fachliche Typ-Enums (keine Status - daher als TS-Enums, app-seitig validiert)
 * ------------------------------------------------------------------------ */

export const PROJECT_TYPES = [
  { key: "website", label: "Website" },
  { key: "ads", label: "Ads" },
  { key: "crm", label: "CRM" },
  { key: "content", label: "Content" },
  { key: "recruiting", label: "Recruiting" },
  { key: "internal", label: "Intern" },
] as const;
export const PROJECT_TYPE_KEYS = PROJECT_TYPES.map((t) => t.key) as [
  (typeof PROJECT_TYPES)[number]["key"],
  ...(typeof PROJECT_TYPES)[number]["key"][],
];
export type ProjectType = (typeof PROJECT_TYPE_KEYS)[number];

export const CONTRACT_TYPES = [
  { key: "retainer", label: "Retainer" },
  { key: "project", label: "Projekt" },
  { key: "one_off", label: "Einmalig" },
] as const;
export const CONTRACT_TYPE_KEYS = CONTRACT_TYPES.map((t) => t.key) as [
  (typeof CONTRACT_TYPES)[number]["key"],
  ...(typeof CONTRACT_TYPES)[number]["key"][],
];
export type ContractType = (typeof CONTRACT_TYPE_KEYS)[number];

export const RENEWAL_TYPES = [
  { key: "auto", label: "Automatisch" },
  { key: "manual", label: "Manuell" },
  { key: "none", label: "Keine" },
] as const;
export const RENEWAL_TYPE_KEYS = RENEWAL_TYPES.map((t) => t.key) as [
  (typeof RENEWAL_TYPES)[number]["key"],
  ...(typeof RENEWAL_TYPES)[number]["key"][],
];
export type RenewalType = (typeof RENEWAL_TYPE_KEYS)[number];

export const COMPANY_TYPES = [
  { key: "gmbh", label: "GmbH" },
  { key: "ag", label: "AG" },
  { key: "einzelfirma", label: "Einzelfirma" },
  { key: "verein", label: "Verein" },
  { key: "sonstige", label: "Sonstige" },
] as const;
export const COMPANY_TYPE_KEYS = COMPANY_TYPES.map((t) => t.key) as [
  (typeof COMPANY_TYPES)[number]["key"],
  ...(typeof COMPANY_TYPES)[number]["key"][],
];
export type CompanyType = (typeof COMPANY_TYPE_KEYS)[number];

export const FILE_CATEGORIES = [
  { key: "contract", label: "Vertrag" },
  { key: "offer", label: "Angebot" },
  { key: "creative", label: "Creative" },
  { key: "report", label: "Bericht" },
  { key: "briefing", label: "Briefing" },
  { key: "other", label: "Sonstiges" },
] as const;
export const FILE_CATEGORY_KEYS = FILE_CATEGORIES.map((t) => t.key) as [
  (typeof FILE_CATEGORIES)[number]["key"],
  ...(typeof FILE_CATEGORIES)[number]["key"][],
];
export type FileCategory = (typeof FILE_CATEGORY_KEYS)[number];

/* --------------------------------------------------------------------------
 * Phase 4 - Sales-Typ-Enums + Label-Maps
 * ------------------------------------------------------------------------ */
function labelMap<const T extends readonly { key: string; label: string }[]>(
  list: T,
): Record<T[number]["key"], string> {
  return Object.fromEntries(list.map((e) => [e.key, e.label])) as Record<
    T[number]["key"],
    string
  >;
}

export const LEAD_SOURCES = [
  { key: "referral", label: "Empfehlung" },
  { key: "inbound", label: "Inbound" },
  { key: "outbound", label: "Outbound" },
  { key: "event", label: "Event" },
  { key: "social", label: "Social Media" },
  { key: "website", label: "Website" },
  { key: "other", label: "Sonstige" },
] as const;
export const LEAD_SOURCE_KEYS = LEAD_SOURCES.map((t) => t.key) as [
  (typeof LEAD_SOURCES)[number]["key"],
  ...(typeof LEAD_SOURCES)[number]["key"][],
];
export type LeadSource = (typeof LEAD_SOURCE_KEYS)[number];
export const LEAD_SOURCE_LABELS = labelMap(LEAD_SOURCES);

export const OFFER_TYPES = [
  { key: "website", label: "Website" },
  { key: "ads", label: "Ads" },
  { key: "crm", label: "CRM" },
  { key: "content", label: "Content" },
  { key: "recruiting", label: "Recruiting" },
  { key: "custom", label: "Individuell" },
] as const;
export const OFFER_TYPE_KEYS = OFFER_TYPES.map((t) => t.key) as [
  (typeof OFFER_TYPES)[number]["key"],
  ...(typeof OFFER_TYPES)[number]["key"][],
];
export type OfferType = (typeof OFFER_TYPE_KEYS)[number];
export const OFFER_TYPE_LABELS = labelMap(OFFER_TYPES);

export const SALES_ACTIVITY_TYPES = [
  { key: "call", label: "Call" },
  { key: "email", label: "E-Mail" },
  { key: "meeting", label: "Meeting" },
  { key: "offer", label: "Angebot" },
  { key: "note", label: "Notiz" },
  { key: "followup", label: "Follow-up" },
] as const;
export const SALES_ACTIVITY_TYPE_KEYS = SALES_ACTIVITY_TYPES.map(
  (t) => t.key,
) as [
  (typeof SALES_ACTIVITY_TYPES)[number]["key"],
  ...(typeof SALES_ACTIVITY_TYPES)[number]["key"][],
];
export type SalesActivityType = (typeof SALES_ACTIVITY_TYPE_KEYS)[number];
export const SALES_ACTIVITY_TYPE_LABELS = labelMap(SALES_ACTIVITY_TYPES);

export const COMPANY_SIZES = [
  { key: "solo", label: "1 (Solo)" },
  { key: "small", label: "2-10" },
  { key: "medium", label: "11-50" },
  { key: "large", label: "51+" },
] as const;
export const COMPANY_SIZE_KEYS = COMPANY_SIZES.map((t) => t.key) as [
  (typeof COMPANY_SIZES)[number]["key"],
  ...(typeof COMPANY_SIZES)[number]["key"][],
];
export type CompanySize = (typeof COMPANY_SIZE_KEYS)[number];
export const COMPANY_SIZE_LABELS = labelMap(COMPANY_SIZES);

/* --------------------------------------------------------------------------
 * Phase 5 - Client Management
 * ------------------------------------------------------------------------ */
export const CLIENT_INTERACTION_TYPES = [
  { key: "call", label: "Call" },
  { key: "meeting", label: "Meeting" },
  { key: "reporting", label: "Reporting" },
  { key: "email", label: "E-Mail" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "note", label: "Notiz" },
] as const;
export const CLIENT_INTERACTION_TYPE_KEYS = CLIENT_INTERACTION_TYPES.map(
  (t) => t.key,
) as [
  (typeof CLIENT_INTERACTION_TYPES)[number]["key"],
  ...(typeof CLIENT_INTERACTION_TYPES)[number]["key"][],
];
export type ClientInteractionType =
  (typeof CLIENT_INTERACTION_TYPE_KEYS)[number];
export const CLIENT_INTERACTION_TYPE_LABELS = labelMap(CLIENT_INTERACTION_TYPES);

export const CLIENT_PACKAGES = [
  { key: "starter", label: "Starter" },
  { key: "efficient", label: "Efficient" },
  { key: "pro", label: "Pro" },
  { key: "advanced", label: "Advanced" },
] as const;
export const CLIENT_PACKAGE_LABELS = labelMap(CLIENT_PACKAGES);

/** Standard-Checklisten (Titel) fuer Onboarding / Offboarding. */
export const ONBOARDING_ITEMS = [
  "Vertrag erhalten",
  "Kickoff geplant",
  "Zugaenge angefordert",
  "Zugaenge erhalten",
  "Tracking eingerichtet",
  "Projekt erstellt",
  "Team informiert",
] as const;

export const OFFBOARDING_ITEMS = [
  "Datenexport",
  "Abschlussgespraech",
  "Dateien uebergeben",
  "Zugaenge entfernen",
  "Feedback einholen",
] as const;

export const CHECKLIST_TEMPLATES: Record<string, readonly string[]> = {
  onboarding: ONBOARDING_ITEMS,
  offboarding: OFFBOARDING_ITEMS,
};

/* --------------------------------------------------------------------------
 * Phase 6 - Production Hub (Typ-Enums)
 * ------------------------------------------------------------------------ */

/** Werbeplattformen (ad_projects). */
export const AD_PLATFORMS = [
  { key: "meta", label: "Meta" },
  { key: "google", label: "Google" },
  { key: "tiktok", label: "TikTok" },
  { key: "linkedin", label: "LinkedIn" },
] as const;
export const AD_PLATFORM_KEYS = AD_PLATFORMS.map((t) => t.key) as [
  (typeof AD_PLATFORMS)[number]["key"],
  ...(typeof AD_PLATFORMS)[number]["key"][],
];
export type AdPlatform = (typeof AD_PLATFORM_KEYS)[number];
export const AD_PLATFORM_LABELS = labelMap(AD_PLATFORMS);

/** Content-Arten (content_projects). */
export const CONTENT_TYPES = [
  { key: "reel", label: "Reel" },
  { key: "short", label: "Short" },
  { key: "longform", label: "Langform-Video" },
  { key: "post", label: "Post" },
  { key: "story", label: "Story" },
  { key: "carousel", label: "Carousel" },
  { key: "podcast", label: "Podcast" },
] as const;
export const CONTENT_TYPE_KEYS = CONTENT_TYPES.map((t) => t.key) as [
  (typeof CONTENT_TYPES)[number]["key"],
  ...(typeof CONTENT_TYPES)[number]["key"][],
];
export type ContentType = (typeof CONTENT_TYPE_KEYS)[number];
export const CONTENT_TYPE_LABELS = labelMap(CONTENT_TYPES);

/** Content-Plattformen (content_projects). */
export const CONTENT_PLATFORMS = [
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "youtube", label: "YouTube" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "facebook", label: "Facebook" },
  { key: "other", label: "Sonstige" },
] as const;
export const CONTENT_PLATFORM_KEYS = CONTENT_PLATFORMS.map((t) => t.key) as [
  (typeof CONTENT_PLATFORMS)[number]["key"],
  ...(typeof CONTENT_PLATFORMS)[number]["key"][],
];
export type ContentPlatform = (typeof CONTENT_PLATFORM_KEYS)[number];
export const CONTENT_PLATFORM_LABELS = labelMap(CONTENT_PLATFORMS);

/** CMS-Systeme (website_projects). */
export const CMS_OPTIONS = [
  { key: "webflow", label: "Webflow" },
  { key: "wordpress", label: "WordPress" },
  { key: "shopify", label: "Shopify" },
  { key: "framer", label: "Framer" },
  { key: "custom", label: "Eigenentwicklung" },
  { key: "other", label: "Sonstige" },
] as const;
export const CMS_OPTION_KEYS = CMS_OPTIONS.map((t) => t.key) as [
  (typeof CMS_OPTIONS)[number]["key"],
  ...(typeof CMS_OPTIONS)[number]["key"][],
];
export type CmsOption = (typeof CMS_OPTION_KEYS)[number];
export const CMS_OPTION_LABELS = labelMap(CMS_OPTIONS);

/** CRM-Systeme (crm_projects). */
export const CRM_TYPES = [
  { key: "gohighlevel", label: "GoHighLevel" },
  { key: "hubspot", label: "HubSpot" },
  { key: "notion", label: "Notion" },
  { key: "custom", label: "Eigenentwicklung" },
  { key: "other", label: "Sonstige" },
] as const;
export const CRM_TYPE_KEYS = CRM_TYPES.map((t) => t.key) as [
  (typeof CRM_TYPES)[number]["key"],
  ...(typeof CRM_TYPES)[number]["key"][],
];
export type CrmType = (typeof CRM_TYPE_KEYS)[number];
export const CRM_TYPE_LABELS = labelMap(CRM_TYPES);

/** Asset-Kategorien (assets). */
export const ASSET_CATEGORIES = [
  { key: "logos", label: "Logos" },
  { key: "videos", label: "Videos" },
  { key: "images", label: "Bilder" },
  { key: "ads", label: "Anzeigen" },
  { key: "documents", label: "Dokumente" },
  { key: "contracts", label: "Vertraege" },
  { key: "reports", label: "Reports" },
] as const;
export const ASSET_CATEGORY_KEYS = ASSET_CATEGORIES.map((t) => t.key) as [
  (typeof ASSET_CATEGORIES)[number]["key"],
  ...(typeof ASSET_CATEGORIES)[number]["key"][],
];
export type AssetCategory = (typeof ASSET_CATEGORY_KEYS)[number];
export const ASSET_CATEGORY_LABELS = labelMap(ASSET_CATEGORIES);

/** Standard-Aufgaben fuer ein neues Website-Projekt (Task-Vorlage). */
export const WEBSITE_CHECKLIST_ITEMS = [
  "Kickoff",
  "Sitemap",
  "Wireframes",
  "Design",
  "Content",
  "Entwicklung",
  "Tracking",
  "SEO",
  "Testing",
  "Launch",
] as const;

/* --------------------------------------------------------------------------
 * Phase 7 - Creator Pool (Typ-Enums)
 * ------------------------------------------------------------------------ */

/** Creator-Arten (mehrfach pro Creator moeglich). */
export const CREATOR_TYPES = [
  { key: "ugc", label: "UGC Creator" },
  { key: "micro", label: "Micro Influencer" },
  { key: "nano", label: "Nano Influencer" },
  { key: "model", label: "Model" },
  { key: "fitness", label: "Fitness" },
  { key: "beauty", label: "Beauty" },
  { key: "fashion", label: "Fashion" },
  { key: "lifestyle", label: "Lifestyle" },
  { key: "business", label: "Business" },
  { key: "healthcare", label: "Healthcare" },
  { key: "recruiting", label: "Recruiting" },
  { key: "personal_branding", label: "Personal Branding" },
] as const;
export const CREATOR_TYPE_KEYS = CREATOR_TYPES.map((t) => t.key) as [
  (typeof CREATOR_TYPES)[number]["key"],
  ...(typeof CREATOR_TYPES)[number]["key"][],
];
export type CreatorType = (typeof CREATOR_TYPE_KEYS)[number];
export const CREATOR_TYPE_LABELS = labelMap(CREATOR_TYPES);

export const EXPERIENCE_LEVELS = [
  { key: "beginner", label: "Einsteiger" },
  { key: "intermediate", label: "Fortgeschritten" },
  { key: "professional", label: "Profi" },
  { key: "expert", label: "Experte" },
] as const;
export const EXPERIENCE_LEVEL_KEYS = EXPERIENCE_LEVELS.map((t) => t.key) as [
  (typeof EXPERIENCE_LEVELS)[number]["key"],
  ...(typeof EXPERIENCE_LEVELS)[number]["key"][],
];
export type ExperienceLevel = (typeof EXPERIENCE_LEVEL_KEYS)[number];
export const EXPERIENCE_LEVEL_LABELS = labelMap(EXPERIENCE_LEVELS);
/** Numerischer Rang fuer Matching (hoeher = erfahrener). */
export const EXPERIENCE_LEVEL_RANK: Record<string, number> = {
  beginner: 1,
  intermediate: 2,
  professional: 3,
  expert: 4,
};

export const GENDERS = [
  { key: "female", label: "Weiblich" },
  { key: "male", label: "Maennlich" },
  { key: "diverse", label: "Divers" },
] as const;
export const GENDER_KEYS = GENDERS.map((t) => t.key) as [
  (typeof GENDERS)[number]["key"],
  ...(typeof GENDERS)[number]["key"][],
];
export type Gender = (typeof GENDER_KEYS)[number];
export const GENDER_LABELS = labelMap(GENDERS);

export const AVAILABILITY_TYPES = [
  { key: "available", label: "Verfuegbar" },
  { key: "limited", label: "Eingeschraenkt" },
  { key: "unavailable", label: "Nicht verfuegbar" },
] as const;
export const AVAILABILITY_TYPE_KEYS = AVAILABILITY_TYPES.map((t) => t.key) as [
  (typeof AVAILABILITY_TYPES)[number]["key"],
  ...(typeof AVAILABILITY_TYPES)[number]["key"][],
];
export type AvailabilityType = (typeof AVAILABILITY_TYPE_KEYS)[number];
export const AVAILABILITY_TYPE_LABELS = labelMap(AVAILABILITY_TYPES);

export const CREATOR_ASSET_CATEGORIES = [
  { key: "photos", label: "Fotos" },
  { key: "videos", label: "Videos" },
  { key: "ugc", label: "UGC Beispiele" },
  { key: "ads", label: "Werbungen" },
  { key: "references", label: "Referenzen" },
] as const;
export const CREATOR_ASSET_CATEGORY_KEYS = CREATOR_ASSET_CATEGORIES.map(
  (t) => t.key,
) as [
  (typeof CREATOR_ASSET_CATEGORIES)[number]["key"],
  ...(typeof CREATOR_ASSET_CATEGORIES)[number]["key"][],
];
export type CreatorAssetCategory = (typeof CREATOR_ASSET_CATEGORY_KEYS)[number];
export const CREATOR_ASSET_CATEGORY_LABELS = labelMap(CREATOR_ASSET_CATEGORIES);

/** WhatsApp-Gruppen-Status (KEINE Automatik - nur Statusfeld). */
export const CREATOR_GROUP_STATUSES = [
  { key: "not_invited", label: "Nicht eingeladen" },
  { key: "recommended", label: "Einladung empfohlen" },
  { key: "invited", label: "Eingeladen" },
  { key: "member", label: "Mitglied" },
] as const;
export const CREATOR_GROUP_STATUS_KEYS = CREATOR_GROUP_STATUSES.map(
  (t) => t.key,
) as [
  (typeof CREATOR_GROUP_STATUSES)[number]["key"],
  ...(typeof CREATOR_GROUP_STATUSES)[number]["key"][],
];
export type CreatorGroupStatus = (typeof CREATOR_GROUP_STATUS_KEYS)[number];
export const CREATOR_GROUP_STATUS_LABELS = labelMap(CREATOR_GROUP_STATUSES);

export const CREATOR_LANGUAGES = [
  { key: "de", label: "Deutsch" },
  { key: "en", label: "Englisch" },
  { key: "fr", label: "Franzoesisch" },
  { key: "it", label: "Italienisch" },
  { key: "es", label: "Spanisch" },
  { key: "pt", label: "Portugiesisch" },
] as const;
export const CREATOR_LANGUAGE_KEYS = CREATOR_LANGUAGES.map((t) => t.key) as [
  (typeof CREATOR_LANGUAGES)[number]["key"],
  ...(typeof CREATOR_LANGUAGES)[number]["key"][],
];
export type CreatorLanguage = (typeof CREATOR_LANGUAGE_KEYS)[number];
export const CREATOR_LANGUAGE_LABELS = labelMap(CREATOR_LANGUAGES);

/** Interne Bewertungskriterien (1-5 Sterne). */
export const RATING_CRITERIA = [
  { key: "punctuality", label: "Puenktlichkeit" },
  { key: "appearance", label: "Auftreten" },
  { key: "camera_quality", label: "Kameraqualitaet" },
  { key: "communication", label: "Kommunikation" },
  { key: "professionalism", label: "Professionalitaet" },
] as const;
export const RATING_CRITERIA_KEYS = RATING_CRITERIA.map((t) => t.key) as [
  (typeof RATING_CRITERIA)[number]["key"],
  ...(typeof RATING_CRITERIA)[number]["key"][],
];
export type RatingCriterion = (typeof RATING_CRITERIA_KEYS)[number];
export const RATING_CRITERIA_LABELS = labelMap(RATING_CRITERIA);

/** Vorschlags-Tags fuer Creator (frei kombinierbar). */
export const CREATOR_TAG_SUGGESTIONS = [
  "Zuerich",
  "UGC",
  "Beauty",
  "Fitness",
  "Mutter",
  "Senior",
  "Pflege",
  "Business",
  "Luxus",
  "Auto",
  "Deutsch",
  "Englisch",
] as const;

/* --------------------------------------------------------------------------
 * Phase 8 - Finance (Typ-Enums)
 * ------------------------------------------------------------------------ */

/** Kostenkategorien (expenses). */
export const EXPENSE_CATEGORIES = [
  { key: "ai_tools", label: "AI Tools" },
  { key: "software", label: "Software" },
  { key: "advertising", label: "Werbung" },
  { key: "freelancer", label: "Freelancer" },
  { key: "videographer", label: "Videograf" },
  { key: "models", label: "Models" },
  { key: "office", label: "Buero" },
  { key: "hosting", label: "Hosting" },
  { key: "travel", label: "Reisen" },
  { key: "other", label: "Sonstiges" },
] as const;
export const EXPENSE_CATEGORY_KEYS = EXPENSE_CATEGORIES.map((t) => t.key) as [
  (typeof EXPENSE_CATEGORIES)[number]["key"],
  ...(typeof EXPENSE_CATEGORIES)[number]["key"][],
];
export type ExpenseCategory = (typeof EXPENSE_CATEGORY_KEYS)[number];
export const EXPENSE_CATEGORY_LABELS = labelMap(EXPENSE_CATEGORIES);

/** Frequenz wiederkehrender Kosten. */
export const RECURRING_FREQUENCIES = [
  { key: "monthly", label: "Monatlich" },
  { key: "quarterly", label: "Quartalsweise" },
  { key: "yearly", label: "Jaehrlich" },
] as const;
export const RECURRING_FREQUENCY_KEYS = RECURRING_FREQUENCIES.map(
  (t) => t.key,
) as [
  (typeof RECURRING_FREQUENCIES)[number]["key"],
  ...(typeof RECURRING_FREQUENCIES)[number]["key"][],
];
export type RecurringFrequency = (typeof RECURRING_FREQUENCY_KEYS)[number];
export const RECURRING_FREQUENCY_LABELS = labelMap(RECURRING_FREQUENCIES);

/* --------------------------------------------------------------------------
 * Phase 9 - AI & Automation Layer (Typ-Enums, app-validiert)
 * ------------------------------------------------------------------------ */

export const AI_PROMPT_STATUSES = [
  { key: "active", label: "Aktiv" },
  { key: "inactive", label: "Inaktiv" },
] as const;
export const AI_PROMPT_STATUS_KEYS = AI_PROMPT_STATUSES.map((t) => t.key) as [
  (typeof AI_PROMPT_STATUSES)[number]["key"],
  ...(typeof AI_PROMPT_STATUSES)[number]["key"][],
];
export const AI_PROMPT_STATUS_LABELS = labelMap(AI_PROMPT_STATUSES);

export const AI_PROMPT_CATEGORIES = [
  { key: "lead", label: "Lead" },
  { key: "audit", label: "Website-Audit" },
  { key: "ads", label: "Ads" },
  { key: "content", label: "Content" },
  { key: "recruiting", label: "Recruiting" },
  { key: "crm", label: "CRM" },
  { key: "outreach", label: "Outreach" },
  { key: "proposal", label: "Proposal" },
  { key: "meeting", label: "Meeting" },
  { key: "general", label: "Allgemein" },
] as const;
export const AI_PROMPT_CATEGORY_KEYS = AI_PROMPT_CATEGORIES.map((t) => t.key) as [
  (typeof AI_PROMPT_CATEGORIES)[number]["key"],
  ...(typeof AI_PROMPT_CATEGORIES)[number]["key"][],
];
export const AI_PROMPT_CATEGORY_LABELS = labelMap(AI_PROMPT_CATEGORIES);

/** Auswaehlbare Modelle (Claude bevorzugt). */
export const AI_MODELS = [
  { key: "claude-opus-4-8", label: "Claude Opus 4.8" },
  { key: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { key: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
  { key: "gpt-4o", label: "GPT-4o" },
  { key: "gpt-4o-mini", label: "GPT-4o mini" },
] as const;
export const AI_MODEL_KEYS = AI_MODELS.map((t) => t.key) as [
  (typeof AI_MODELS)[number]["key"],
  ...(typeof AI_MODELS)[number]["key"][],
];
export const AI_MODEL_LABELS = labelMap(AI_MODELS);

export const AI_RUN_STATUSES = [
  { key: "pending", label: "Ausstehend", color: "gray" },
  { key: "running", label: "Laeuft", color: "blue" },
  { key: "success", label: "Erfolgreich", color: "green" },
  { key: "error", label: "Fehler", color: "red" },
  { key: "skipped", label: "Uebersprungen", color: "amber" },
] as const;
export const AI_RUN_STATUS_LABELS = labelMap(AI_RUN_STATUSES);
export function aiRunStatusColor(key: string): string | undefined {
  return AI_RUN_STATUSES.find((s) => s.key === key)?.color;
}

/** Vorbereitete Automation-Job-Typen (noch nicht alle live). */
export const AUTOMATION_JOB_TYPES = [
  { key: "daily_lead_search", label: "Taegliche Lead-Suche" },
  { key: "website_audit", label: "Website-Audit" },
  { key: "outreach_draft", label: "Outreach-Entwurf" },
  { key: "follow_up_check", label: "Follow-up-Pruefung" },
  { key: "reporting_call_reminder", label: "Reporting-Call-Erinnerung" },
  { key: "contract_expiry_check", label: "Vertragsablauf-Pruefung" },
  { key: "creator_matching", label: "Creator-Matching" },
  { key: "proposal_generation", label: "Proposal-Erstellung" },
] as const;
export const AUTOMATION_JOB_TYPE_KEYS = AUTOMATION_JOB_TYPES.map((t) => t.key) as [
  (typeof AUTOMATION_JOB_TYPES)[number]["key"],
  ...(typeof AUTOMATION_JOB_TYPES)[number]["key"][],
];
export const AUTOMATION_JOB_TYPE_LABELS = labelMap(AUTOMATION_JOB_TYPES);

export const AUTOMATION_JOB_STATUSES = [
  { key: "active", label: "Aktiv", color: "green" },
  { key: "paused", label: "Pausiert", color: "amber" },
  { key: "inactive", label: "Inaktiv", color: "gray" },
] as const;
export const AUTOMATION_JOB_STATUS_KEYS = AUTOMATION_JOB_STATUSES.map(
  (t) => t.key,
) as [
  (typeof AUTOMATION_JOB_STATUSES)[number]["key"],
  ...(typeof AUTOMATION_JOB_STATUSES)[number]["key"][],
];
export const AUTOMATION_JOB_STATUS_LABELS = labelMap(AUTOMATION_JOB_STATUSES);
export function automationJobStatusColor(key: string): string | undefined {
  return AUTOMATION_JOB_STATUSES.find((s) => s.key === key)?.color;
}

export const AUTOMATION_RUN_STATUSES = [
  { key: "running", label: "Laeuft", color: "blue" },
  { key: "success", label: "Erfolgreich", color: "green" },
  { key: "error", label: "Fehler", color: "red" },
] as const;
export const AUTOMATION_RUN_STATUS_LABELS = labelMap(AUTOMATION_RUN_STATUSES);
export function automationRunStatusColor(key: string): string | undefined {
  return AUTOMATION_RUN_STATUSES.find((s) => s.key === key)?.color;
}

export const SCHEDULE_TYPES = [
  { key: "daily", label: "Taeglich" },
  { key: "weekly", label: "Woechentlich" },
  { key: "monthly", label: "Monatlich" },
  { key: "manual", label: "Manuell" },
] as const;
export const SCHEDULE_TYPE_KEYS = SCHEDULE_TYPES.map((t) => t.key) as [
  (typeof SCHEDULE_TYPES)[number]["key"],
  ...(typeof SCHEDULE_TYPES)[number]["key"][],
];
export const SCHEDULE_TYPE_LABELS = labelMap(SCHEDULE_TYPES);

export const INTEGRATION_PROVIDERS = [
  { key: "openai", label: "OpenAI" },
  { key: "claude", label: "Claude API" },
  { key: "gmail", label: "Gmail" },
  { key: "resend", label: "Resend" },
  { key: "google_calendar", label: "Google Calendar" },
  { key: "meta_ads", label: "Meta Ads" },
  { key: "google_ads", label: "Google Ads" },
  { key: "tiktok", label: "TikTok" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "whatsapp", label: "WhatsApp" },
] as const;
export const INTEGRATION_PROVIDER_KEYS = INTEGRATION_PROVIDERS.map(
  (t) => t.key,
) as [
  (typeof INTEGRATION_PROVIDERS)[number]["key"],
  ...(typeof INTEGRATION_PROVIDERS)[number]["key"][],
];
export const INTEGRATION_PROVIDER_LABELS = labelMap(INTEGRATION_PROVIDERS);

export const INTEGRATION_STATUSES = [
  { key: "connected", label: "Verbunden", color: "green" },
  { key: "configured", label: "Konfiguriert", color: "blue" },
  { key: "disconnected", label: "Getrennt", color: "gray" },
  { key: "error", label: "Fehler", color: "red" },
] as const;
export const INTEGRATION_STATUS_LABELS = labelMap(INTEGRATION_STATUSES);
export function integrationStatusColor(key: string): string | undefined {
  return INTEGRATION_STATUSES.find((s) => s.key === key)?.color;
}

/* --------------------------------------------------------------------------
 * Phase 10 - Lead Engine
 * ------------------------------------------------------------------------ */

export const LEAD_DISCOVERY_SOURCE_TYPES = [
  { key: "manual", label: "Manuell" },
  { key: "csv", label: "CSV-Import" },
  { key: "osm", label: "OpenStreetMap" },
  { key: "google_places", label: "Google Places" },
  { key: "web", label: "Web" },
] as const;
export const LEAD_DISCOVERY_SOURCE_TYPE_KEYS = LEAD_DISCOVERY_SOURCE_TYPES.map(
  (t) => t.key,
) as [
  (typeof LEAD_DISCOVERY_SOURCE_TYPES)[number]["key"],
  ...(typeof LEAD_DISCOVERY_SOURCE_TYPES)[number]["key"][],
];
export const LEAD_DISCOVERY_SOURCE_TYPE_LABELS = labelMap(LEAD_DISCOVERY_SOURCE_TYPES);

/** Opportunity-Arten der Lead Engine. */
export const LEAD_OPPORTUNITY_TYPES = [
  { key: "website", label: "Website" },
  { key: "ads", label: "Ads" },
  { key: "content", label: "Content" },
  { key: "recruiting", label: "Recruiting" },
  { key: "crm", label: "CRM" },
  { key: "automation", label: "Automation" },
  { key: "growth", label: "Growth System" },
] as const;
export const LEAD_OPPORTUNITY_TYPE_KEYS = LEAD_OPPORTUNITY_TYPES.map((t) => t.key) as [
  (typeof LEAD_OPPORTUNITY_TYPES)[number]["key"],
  ...(typeof LEAD_OPPORTUNITY_TYPES)[number]["key"][],
];
export const LEAD_OPPORTUNITY_TYPE_LABELS = labelMap(LEAD_OPPORTUNITY_TYPES);

export const WATCHLIST_STATUSES = [
  { key: "watch", label: "Beobachten", color: "blue" },
  { key: "active", label: "Aktiv bearbeiten", color: "green" },
  { key: "not_relevant", label: "Nicht relevant", color: "gray" },
] as const;
export const WATCHLIST_STATUS_KEYS = WATCHLIST_STATUSES.map((t) => t.key) as [
  (typeof WATCHLIST_STATUSES)[number]["key"],
  ...(typeof WATCHLIST_STATUSES)[number]["key"][],
];
export const WATCHLIST_STATUS_LABELS = labelMap(WATCHLIST_STATUSES);
export function watchlistStatusColor(key: string): string | undefined {
  return WATCHLIST_STATUSES.find((s) => s.key === key)?.color;
}

/** Standard-Zielregionen (konfigurierbar). */
export const TARGET_REGIONS = [
  "Zuerich",
  "Winterthur",
  "Zug",
  "Luzern",
  "Basel",
  "Schweiz",
] as const;

/** Standard-Zielbranchen (konfigurierbar). */
export const TARGET_INDUSTRIES = [
  "Treuhaender",
  "Broker",
  "Versicherungsberater",
  "Finanzberater",
  "Immobilienmakler",
  "Spitex",
  "Pflegeunternehmen",
  "Physiotherapie",
  "Zahnarzt",
  "Coach",
  "Berater",
  "Lokale Dienstleister",
  "KMU",
] as const;

/** Website-Scan-Pruefpunkte (Struktur). */
export const WEBSITE_SCAN_CHECKS = [
  { key: "has_website", label: "Website vorhanden" },
  { key: "https", label: "HTTPS" },
  { key: "mobile_friendly", label: "Mobile-freundlich" },
  { key: "has_contact_form", label: "Kontaktformular" },
  { key: "has_cta", label: "CTA vorhanden" },
  { key: "has_social_links", label: "Social Links" },
  { key: "has_imprint", label: "Impressum" },
  { key: "has_tracking", label: "Tracking-Hinweise" },
] as const;
export const WEBSITE_SCAN_CHECK_KEYS = WEBSITE_SCAN_CHECKS.map((t) => t.key) as [
  (typeof WEBSITE_SCAN_CHECKS)[number]["key"],
  ...(typeof WEBSITE_SCAN_CHECKS)[number]["key"][],
];

/** Score-Stufe (0-100) -> Label + Farbton. */
export function leadScoreLevel(score: number): { label: string; tone: StatusColor } {
  if (score >= 90) return { label: "Sehr heiss", tone: "red" };
  if (score >= 75) return { label: "Hohe Prioritaet", tone: "amber" };
  if (score >= 60) return { label: "Interessant", tone: "blue" };
  if (score >= 40) return { label: "Mittel", tone: "gray" };
  return { label: "Niedrig", tone: "gray" };
}

/* --------------------------------------------------------------------------
 * Phase 11 - Outreach (Typ-Enums)
 * ------------------------------------------------------------------------ */

export const CAMPAIGN_TYPES = [
  { key: "website_audit", label: "Website Audit" },
  { key: "meta_ads", label: "Meta Ads" },
  { key: "google_ads", label: "Google Ads" },
  { key: "recruiting", label: "Recruiting" },
  { key: "crm", label: "CRM" },
  { key: "content", label: "Content Produktion" },
  { key: "video", label: "Videoproduktion" },
  { key: "general", label: "Allgemeine Akquise" },
] as const;
export const CAMPAIGN_TYPE_KEYS = CAMPAIGN_TYPES.map((t) => t.key) as [
  (typeof CAMPAIGN_TYPES)[number]["key"],
  ...(typeof CAMPAIGN_TYPES)[number]["key"][],
];
export const CAMPAIGN_TYPE_LABELS = labelMap(CAMPAIGN_TYPES);

export const CAMPAIGN_STATUSES = [
  { key: "draft", label: "Entwurf", color: "gray" },
  { key: "active", label: "Aktiv", color: "green" },
  { key: "paused", label: "Pausiert", color: "amber" },
  { key: "completed", label: "Abgeschlossen", color: "blue" },
] as const;
export const CAMPAIGN_STATUS_KEYS = CAMPAIGN_STATUSES.map((t) => t.key) as [
  (typeof CAMPAIGN_STATUSES)[number]["key"],
  ...(typeof CAMPAIGN_STATUSES)[number]["key"][],
];
export const CAMPAIGN_STATUS_LABELS = labelMap(CAMPAIGN_STATUSES);
export function campaignStatusColor(key: string): string | undefined {
  return CAMPAIGN_STATUSES.find((s) => s.key === key)?.color;
}

export const EMAIL_TEMPLATE_CATEGORIES = [
  { key: "website_audit", label: "Website Audit" },
  { key: "meta_ads", label: "Meta Ads" },
  { key: "google_ads", label: "Google Ads" },
  { key: "recruiting", label: "Recruiting" },
  { key: "crm", label: "CRM" },
  { key: "content", label: "Content" },
  { key: "followup", label: "Follow-up" },
  { key: "general", label: "Allgemein" },
] as const;
export const EMAIL_TEMPLATE_CATEGORY_KEYS = EMAIL_TEMPLATE_CATEGORIES.map(
  (t) => t.key,
) as [
  (typeof EMAIL_TEMPLATE_CATEGORIES)[number]["key"],
  ...(typeof EMAIL_TEMPLATE_CATEGORIES)[number]["key"][],
];
export const EMAIL_TEMPLATE_CATEGORY_LABELS = labelMap(EMAIL_TEMPLATE_CATEGORIES);

export const MEETING_SOURCES = [
  { key: "manual", label: "Manuell" },
  { key: "calendly", label: "Calendly" },
  { key: "google", label: "Google Calendar" },
] as const;
export const MEETING_SOURCE_KEYS = MEETING_SOURCES.map((t) => t.key) as [
  (typeof MEETING_SOURCES)[number]["key"],
  ...(typeof MEETING_SOURCES)[number]["key"][],
];
export const MEETING_SOURCE_LABELS = labelMap(MEETING_SOURCES);

export function bookedMeetingStatusColor(key: string): string | undefined {
  return BOOKED_MEETING_STATUSES.find((s) => s.key === key)?.color;
}
export function outreachMessageStatusColor(key: string): string | undefined {
  return OUTREACH_MESSAGE_STATUSES.find((s) => s.key === key)?.color;
}

/* --------------------------------------------------------------------------
 * Phase 12 - Website Audit Engine
 * ------------------------------------------------------------------------ */

/** Die 8 Audit-Kategorien (Reihenfolge = Anzeige). */
export const AUDIT_CATEGORIES = [
  { key: "design", label: "Design" },
  { key: "conversion", label: "Conversion" },
  { key: "seo", label: "SEO" },
  { key: "trust", label: "Trust" },
  { key: "performance", label: "Performance" },
  { key: "mobile", label: "Mobile" },
  { key: "content", label: "Content" },
  { key: "tracking", label: "Tracking" },
] as const;
export const AUDIT_CATEGORY_KEYS = AUDIT_CATEGORIES.map((t) => t.key) as [
  (typeof AUDIT_CATEGORIES)[number]["key"],
  ...(typeof AUDIT_CATEGORIES)[number]["key"][],
];
export const AUDIT_CATEGORY_LABELS = labelMap(AUDIT_CATEGORIES);

export const AUDIT_SEVERITIES = [
  { key: "critical", label: "Kritisch", color: "red" },
  { key: "high", label: "Hoch", color: "amber" },
  { key: "medium", label: "Mittel", color: "blue" },
  { key: "low", label: "Niedrig", color: "gray" },
] as const;
export const AUDIT_SEVERITY_LABELS = labelMap(AUDIT_SEVERITIES);
export function auditSeverityColor(key: string): string | undefined {
  return AUDIT_SEVERITIES.find((s) => s.key === key)?.color;
}

export const AUDIT_OPPORTUNITY_TYPES = [
  { key: "new_website", label: "Neue Website" },
  { key: "relaunch", label: "Website Relaunch" },
  { key: "seo", label: "SEO" },
  { key: "meta_ads", label: "Meta Ads" },
  { key: "google_ads", label: "Google Ads" },
  { key: "content", label: "Content Produktion" },
  { key: "recruiting", label: "Recruiting Funnel" },
  { key: "crm", label: "CRM" },
  { key: "automation", label: "Automationen" },
] as const;
export const AUDIT_OPPORTUNITY_TYPE_LABELS = labelMap(AUDIT_OPPORTUNITY_TYPES);

export const AUDIT_STATUSES = [
  { key: "draft", label: "Entwurf", color: "gray" },
  { key: "generated", label: "Generiert", color: "green" },
] as const;
export const AUDIT_STATUS_LABELS = labelMap(AUDIT_STATUSES);

/** Audit-Score-Stufe (hoch = gute Website). */
export function auditScoreLevel(score: number): { label: string; tone: StatusColor } {
  if (score >= 90) return { label: "Exzellent", tone: "green" };
  if (score >= 75) return { label: "Gut", tone: "green" };
  if (score >= 60) return { label: "Verbesserbar", tone: "blue" };
  if (score >= 40) return { label: "Schwach", tone: "amber" };
  return { label: "Kritisch", tone: "red" };
}

/* --------------------------------------------------------------------------
 * Phase 13 - Proposal Engine (Typ-Enums + Templates)
 * ------------------------------------------------------------------------ */

export const PROPOSAL_TYPES = [
  { key: "website", label: "Website" },
  { key: "ads", label: "Ads" },
  { key: "crm", label: "CRM" },
  { key: "content", label: "Content Produktion" },
  { key: "recruiting", label: "Recruiting" },
  { key: "growth", label: "Growth System" },
  { key: "custom", label: "Individuell" },
] as const;
export const PROPOSAL_TYPE_KEYS = PROPOSAL_TYPES.map((t) => t.key) as [
  (typeof PROPOSAL_TYPES)[number]["key"],
  ...(typeof PROPOSAL_TYPES)[number]["key"][],
];
export const PROPOSAL_TYPE_LABELS = labelMap(PROPOSAL_TYPES);

export const PRICING_CATEGORIES = [
  { key: "website", label: "Website" },
  { key: "ads", label: "Ads" },
  { key: "crm", label: "CRM" },
  { key: "content", label: "Content" },
  { key: "recruiting", label: "Recruiting" },
  { key: "support", label: "Support" },
  { key: "other", label: "Sonstiges" },
] as const;
export const PRICING_CATEGORY_KEYS = PRICING_CATEGORIES.map((t) => t.key) as [
  (typeof PRICING_CATEGORIES)[number]["key"],
  ...(typeof PRICING_CATEGORIES)[number]["key"][],
];
export const PRICING_CATEGORY_LABELS = labelMap(PRICING_CATEGORIES);

/** Standard-Leistungen je Proposal-Typ (Vorlage fuer proposal_items). */
export interface ProposalTemplateItem {
  title: string;
  category: string;
  recurring: boolean;
}
export const PROPOSAL_TEMPLATES: Record<string, readonly ProposalTemplateItem[]> = {
  website: [
    { title: "Website Relaunch", category: "website", recurring: false },
    { title: "SEO Setup", category: "website", recurring: false },
    { title: "Tracking", category: "website", recurring: false },
    { title: "Kontaktformular", category: "website", recurring: false },
    { title: "Mobile Optimierung", category: "website", recurring: false },
  ],
  ads: [
    { title: "Meta Ads", category: "ads", recurring: true },
    { title: "Google Ads", category: "ads", recurring: true },
    { title: "Landingpage", category: "ads", recurring: false },
    { title: "Tracking", category: "ads", recurring: false },
    { title: "Reporting", category: "ads", recurring: true },
    { title: "Optimierung", category: "ads", recurring: true },
  ],
  crm: [
    { title: "Lead CRM", category: "crm", recurring: false },
    { title: "Pipeline", category: "crm", recurring: false },
    { title: "Automationen", category: "crm", recurring: false },
    { title: "Benutzer", category: "crm", recurring: true },
    { title: "Reporting", category: "crm", recurring: true },
    { title: "Support", category: "support", recurring: true },
  ],
  content: [
    { title: "Videoproduktion", category: "content", recurring: false },
    { title: "Reels", category: "content", recurring: true },
    { title: "Ad Creatives", category: "content", recurring: true },
    { title: "Models", category: "content", recurring: false },
    { title: "Schnitt", category: "content", recurring: false },
    { title: "Planung", category: "content", recurring: true },
  ],
  recruiting: [
    { title: "Recruiting Ads", category: "recruiting", recurring: true },
    { title: "Bewerber Funnel", category: "recruiting", recurring: false },
    { title: "Bewerber CRM", category: "recruiting", recurring: false },
    { title: "Video Ads", category: "content", recurring: false },
  ],
  growth: [
    { title: "Website", category: "website", recurring: false },
    { title: "Ads", category: "ads", recurring: true },
    { title: "CRM", category: "crm", recurring: false },
    { title: "Automationen", category: "crm", recurring: false },
    { title: "Reporting", category: "ads", recurring: true },
  ],
  custom: [],
};

/** Praesentationsstruktur (Reihenfolge der Folien). */
export const PRESENTATION_STRUCTURE = [
  "Titel",
  "Ausgangslage",
  "Problem",
  "Zielbild",
  "Loesung",
  "Leistungen",
  "Ablauf",
  "Investition",
  "Naechste Schritte",
] as const;

/* --------------------------------------------------------------------------
 * Phase 14 - Knowledge Base, Meeting Assistant & SOPs
 * ------------------------------------------------------------------------ */

export const MEETING_TYPES = [
  { key: "sales_call", label: "Sales Call" },
  { key: "reporting", label: "Reporting Call" },
  { key: "onboarding", label: "Onboarding" },
  { key: "internal", label: "Intern" },
  { key: "strategy", label: "Strategie" },
  { key: "client", label: "Kunde" },
] as const;
export const MEETING_TYPE_KEYS = MEETING_TYPES.map((t) => t.key) as [
  (typeof MEETING_TYPES)[number]["key"],
  ...(typeof MEETING_TYPES)[number]["key"][],
];
export const MEETING_TYPE_LABELS = labelMap(MEETING_TYPES);

export const KNOWLEDGE_CATEGORIES = [
  { key: "sales", label: "Sales" },
  { key: "ads", label: "Ads" },
  { key: "websites", label: "Websites" },
  { key: "crm", label: "CRM" },
  { key: "recruiting", label: "Recruiting" },
  { key: "content", label: "Content" },
  { key: "sop", label: "SOP" },
  { key: "clients", label: "Kunden" },
  { key: "internal", label: "Intern" },
] as const;
export const KNOWLEDGE_CATEGORY_KEYS = KNOWLEDGE_CATEGORIES.map((t) => t.key) as [
  (typeof KNOWLEDGE_CATEGORIES)[number]["key"],
  ...(typeof KNOWLEDGE_CATEGORIES)[number]["key"][],
];
export const KNOWLEDGE_CATEGORY_LABELS = labelMap(KNOWLEDGE_CATEGORIES);

export const ARTICLE_STATUSES = [
  { key: "draft", label: "Entwurf", color: "gray" },
  { key: "published", label: "Veroeffentlicht", color: "green" },
] as const;
export const ARTICLE_STATUS_KEYS = ARTICLE_STATUSES.map((t) => t.key) as [
  (typeof ARTICLE_STATUSES)[number]["key"],
  ...(typeof ARTICLE_STATUSES)[number]["key"][],
];
export const ARTICLE_STATUS_LABELS = labelMap(ARTICLE_STATUSES);
export function articleStatusColor(key: string): string | undefined {
  return ARTICLE_STATUSES.find((s) => s.key === key)?.color;
}

export const SOP_STATUSES = [
  { key: "draft", label: "Entwurf", color: "gray" },
  { key: "active", label: "Aktiv", color: "green" },
  { key: "archived", label: "Archiviert", color: "gray" },
] as const;
export const SOP_STATUS_KEYS = SOP_STATUSES.map((t) => t.key) as [
  (typeof SOP_STATUSES)[number]["key"],
  ...(typeof SOP_STATUSES)[number]["key"][],
];
export const SOP_STATUS_LABELS = labelMap(SOP_STATUSES);
export function sopStatusColor(key: string): string | undefined {
  return SOP_STATUSES.find((s) => s.key === key)?.color;
}

export const PROMPT_LIBRARY_CATEGORIES = [
  { key: "claude_code", label: "Claude Code" },
  { key: "lovable", label: "Lovable" },
  { key: "meta_ads", label: "Meta Ads" },
  { key: "google_ads", label: "Google Ads" },
  { key: "sales", label: "Sales" },
  { key: "crm", label: "CRM" },
  { key: "recruiting", label: "Recruiting" },
  { key: "content", label: "Content" },
  { key: "seo", label: "SEO" },
] as const;
export const PROMPT_LIBRARY_CATEGORY_KEYS = PROMPT_LIBRARY_CATEGORIES.map(
  (t) => t.key,
) as [
  (typeof PROMPT_LIBRARY_CATEGORIES)[number]["key"],
  ...(typeof PROMPT_LIBRARY_CATEGORIES)[number]["key"][],
];
export const PROMPT_LIBRARY_CATEGORY_LABELS = labelMap(PROMPT_LIBRARY_CATEGORIES);

/* --------------------------------------------------------------------------
 * Phase 15 - Executive Command Center
 * ------------------------------------------------------------------------ */

export const ALERT_CATEGORIES = [
  { key: "revenue", label: "Umsatz" },
  { key: "client", label: "Kunde" },
  { key: "contract", label: "Vertrag" },
  { key: "project", label: "Projekt" },
  { key: "team", label: "Team" },
  { key: "finance", label: "Finance" },
  { key: "sales", label: "Sales" },
] as const;
export const ALERT_CATEGORY_KEYS = ALERT_CATEGORIES.map((t) => t.key) as [
  (typeof ALERT_CATEGORIES)[number]["key"],
  ...(typeof ALERT_CATEGORIES)[number]["key"][],
];
export const ALERT_CATEGORY_LABELS = labelMap(ALERT_CATEGORIES);

export const ALERT_SEVERITIES = [
  { key: "critical", label: "Kritisch", color: "red" },
  { key: "high", label: "Hoch", color: "amber" },
  { key: "medium", label: "Mittel", color: "blue" },
  { key: "info", label: "Info", color: "gray" },
] as const;
export const ALERT_SEVERITY_KEYS = ALERT_SEVERITIES.map((t) => t.key) as [
  (typeof ALERT_SEVERITIES)[number]["key"],
  ...(typeof ALERT_SEVERITIES)[number]["key"][],
];
export const ALERT_SEVERITY_LABELS = labelMap(ALERT_SEVERITIES);
export function alertSeverityColor(key: string): string | undefined {
  return ALERT_SEVERITIES.find((s) => s.key === key)?.color;
}
const ALERT_SEVERITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, info: 3 };
export function alertSeverityRank(key: string): number {
  return ALERT_SEVERITY_RANK[key] ?? 4;
}

/** Health-Stufe (Projekt/Kunde): aus Anzahl Probleme. */
export const HEALTH_STATUSES = [
  { key: "healthy", label: "Gesund", color: "green" },
  { key: "attention", label: "Achtung", color: "blue" },
  { key: "risk", label: "Risiko", color: "amber" },
  { key: "critical", label: "Kritisch", color: "red" },
] as const;
export const HEALTH_STATUS_LABELS = labelMap(HEALTH_STATUSES);
export function healthColor(key: string): string | undefined {
  return HEALTH_STATUSES.find((s) => s.key === key)?.color;
}
export function healthFromIssues(issues: number): { key: string; label: string; color: StatusColor } {
  if (issues <= 0) return { key: "healthy", label: "Gesund", color: "green" };
  if (issues === 1) return { key: "attention", label: "Achtung", color: "blue" };
  if (issues === 2) return { key: "risk", label: "Risiko", color: "amber" };
  return { key: "critical", label: "Kritisch", color: "red" };
}

/* --------------------------------------------------------------------------
 * Phase 16 - Growth Engine (Upsell / Referral / Renewal / Churn)
 * ------------------------------------------------------------------------ */

export const UPSELL_OPPORTUNITY_TYPES = [
  { key: "website", label: "Website" },
  { key: "seo", label: "SEO" },
  { key: "meta_ads", label: "Meta Ads" },
  { key: "google_ads", label: "Google Ads" },
  { key: "tiktok_ads", label: "TikTok Ads" },
  { key: "crm", label: "CRM" },
  { key: "automation", label: "Automationen" },
  { key: "recruiting", label: "Recruiting" },
  { key: "video", label: "Videoproduktion" },
  { key: "content", label: "Content Produktion" },
  { key: "landingpages", label: "Landingpages" },
  { key: "reporting_upgrade", label: "Reporting Upgrade" },
] as const;
export const UPSELL_OPPORTUNITY_TYPE_LABELS = labelMap(UPSELL_OPPORTUNITY_TYPES);

export const GROWTH_STATUSES = [
  { key: "open", label: "Offen", color: "blue" },
  { key: "in_progress", label: "In Bearbeitung", color: "amber" },
  { key: "won", label: "Gewonnen", color: "green" },
  { key: "lost", label: "Verloren", color: "red" },
  { key: "dismissed", label: "Verworfen", color: "gray" },
] as const;
export const GROWTH_STATUS_KEYS = GROWTH_STATUSES.map((t) => t.key) as [
  (typeof GROWTH_STATUSES)[number]["key"],
  ...(typeof GROWTH_STATUSES)[number]["key"][],
];
export const GROWTH_STATUS_LABELS = labelMap(GROWTH_STATUSES);
export function growthStatusColor(key: string): string | undefined {
  return GROWTH_STATUSES.find((s) => s.key === key)?.color;
}

export const REVIEW_STATUSES = [
  { key: "pending", label: "Ausstehend", color: "gray" },
  { key: "requested", label: "Angefragt", color: "blue" },
  { key: "received", label: "Erhalten", color: "green" },
  { key: "declined", label: "Abgelehnt", color: "red" },
] as const;
export const REVIEW_STATUS_KEYS = REVIEW_STATUSES.map((t) => t.key) as [
  (typeof REVIEW_STATUSES)[number]["key"],
  ...(typeof REVIEW_STATUSES)[number]["key"][],
];
export const REVIEW_STATUS_LABELS = labelMap(REVIEW_STATUSES);
export function reviewStatusColor(key: string): string | undefined {
  return REVIEW_STATUSES.find((s) => s.key === key)?.color;
}

export const RENEWAL_STATUSES = [
  { key: "pending", label: "Offen", color: "amber" },
  { key: "in_progress", label: "In Bearbeitung", color: "blue" },
  { key: "renewed", label: "Verlaengert", color: "green" },
  { key: "lost", label: "Verloren", color: "red" },
] as const;
export const RENEWAL_STATUS_KEYS = RENEWAL_STATUSES.map((t) => t.key) as [
  (typeof RENEWAL_STATUSES)[number]["key"],
  ...(typeof RENEWAL_STATUSES)[number]["key"][],
];
export const RENEWAL_STATUS_LABELS = labelMap(RENEWAL_STATUSES);
export function renewalStatusColor(key: string): string | undefined {
  return RENEWAL_STATUSES.find((s) => s.key === key)?.color;
}

export const TESTIMONIAL_TYPES = [
  { key: "text", label: "Text" },
  { key: "video", label: "Video" },
  { key: "case_study", label: "Fallstudie" },
] as const;
export const TESTIMONIAL_TYPE_KEYS = TESTIMONIAL_TYPES.map((t) => t.key) as [
  (typeof TESTIMONIAL_TYPES)[number]["key"],
  ...(typeof TESTIMONIAL_TYPES)[number]["key"][],
];
export const TESTIMONIAL_TYPE_LABELS = labelMap(TESTIMONIAL_TYPES);

export const TESTIMONIAL_STATUSES = [
  { key: "requested", label: "Angefragt", color: "blue" },
  { key: "in_progress", label: "In Arbeit", color: "amber" },
  { key: "received", label: "Erhalten", color: "green" },
  { key: "published", label: "Veroeffentlicht", color: "green" },
] as const;
export const TESTIMONIAL_STATUS_KEYS = TESTIMONIAL_STATUSES.map((t) => t.key) as [
  (typeof TESTIMONIAL_STATUSES)[number]["key"],
  ...(typeof TESTIMONIAL_STATUSES)[number]["key"][],
];
export const TESTIMONIAL_STATUS_LABELS = labelMap(TESTIMONIAL_STATUSES);
export function testimonialStatusColor(key: string): string | undefined {
  return TESTIMONIAL_STATUSES.find((s) => s.key === key)?.color;
}

/** Customer-Success-Playbooks (empfohlene Aktionen). */
export const CS_PLAYBOOKS = [
  "Reporting Call durchfuehren",
  "Upsell besprechen",
  "Referenz einholen",
  "Testimonial aufnehmen",
  "Verlaengerung vorbereiten",
] as const;

/* --------------------------------------------------------------------------
 * Phase 17 - Autonomous Growth Engine (Orchestrierungsschicht)
 * ------------------------------------------------------------------------ */

/** Die 10 Stufen der Revenue Journey (Reihenfolge = Funnel + Sortierung). */
export const REVENUE_STAGES = [
  { key: "discovery", label: "Discovery", color: "gray", isDefault: true },
  { key: "audit", label: "Audit", color: "gray" },
  { key: "outreach", label: "Outreach", color: "blue" },
  { key: "meeting", label: "Termin", color: "blue" },
  { key: "proposal", label: "Angebot", color: "amber" },
  { key: "contract", label: "Vertrag", color: "amber" },
  { key: "client", label: "Kunde", color: "green" },
  { key: "expansion", label: "Expansion", color: "green" },
  { key: "referral", label: "Empfehlung", color: "green" },
  { key: "renewal", label: "Verlaengerung", color: "green" },
] as const satisfies readonly CatalogEntry[];
export const REVENUE_STAGE_KEYS = keysOf(REVENUE_STAGES);
export type RevenueStage = (typeof REVENUE_STAGE_KEYS)[number];
export const REVENUE_STAGE_LABELS = labelMap(REVENUE_STAGES);
export const REVENUE_STAGE_MAP = buildMap(REVENUE_STAGES);
/** 0-basierter Index einer Stage (fuer Fortschritt/Sortierung). */
export function revenueStageIndex(key: string | null): number {
  if (!key) return 0;
  const i = REVENUE_STAGE_KEYS.indexOf(key as RevenueStage);
  return i < 0 ? 0 : i;
}
export function revenueStageLabel(key: string | null): string {
  if (!key) return "-";
  return REVENUE_STAGE_MAP[key as RevenueStage]?.label ?? key;
}
export function revenueStageColor(key: string | null): StatusColor {
  if (!key) return "gray";
  return (REVENUE_STAGE_MAP[key as RevenueStage]?.color as StatusColor) ?? "gray";
}

/** Pipeline-Visualisierung: die elf Funnel-Schritte (Prompt-Reihenfolge). */
export const GROWTH_PIPELINE_STEPS = [
  { key: "leads_found", label: "Leads gefunden" },
  { key: "leads_analyzed", label: "Leads analysiert" },
  { key: "audits_created", label: "Audits erstellt" },
  { key: "outreach_prepared", label: "Outreach vorbereitet" },
  { key: "contact_made", label: "Kontakt hergestellt" },
  { key: "meeting_booked", label: "Termin gebucht" },
  { key: "proposal_created", label: "Angebot erstellt" },
  { key: "contract_created", label: "Vertrag erstellt" },
  { key: "client_won", label: "Kunde gewonnen" },
  { key: "upsell_detected", label: "Upsell erkannt" },
  { key: "referral_received", label: "Empfehlung erhalten" },
] as const;
export const GROWTH_PIPELINE_STEP_KEYS = GROWTH_PIPELINE_STEPS.map((s) => s.key) as [
  (typeof GROWTH_PIPELINE_STEPS)[number]["key"],
  ...(typeof GROWTH_PIPELINE_STEPS)[number]["key"][],
];
export type GrowthPipelineStep = (typeof GROWTH_PIPELINE_STEP_KEYS)[number];

/** Status einer Revenue Journey. */
export const JOURNEY_STATUSES = [
  { key: "active", label: "Aktiv", color: "blue" },
  { key: "won", label: "Gewonnen", color: "green" },
  { key: "lost", label: "Verloren", color: "red" },
  { key: "paused", label: "Pausiert", color: "gray" },
] as const;
export const JOURNEY_STATUS_KEYS = JOURNEY_STATUSES.map((t) => t.key) as [
  (typeof JOURNEY_STATUSES)[number]["key"],
  ...(typeof JOURNEY_STATUSES)[number]["key"][],
];
export type JourneyStatus = (typeof JOURNEY_STATUS_KEYS)[number];
export const JOURNEY_STATUS_LABELS = labelMap(JOURNEY_STATUSES);
export function journeyStatusColor(key: string): string | undefined {
  return JOURNEY_STATUSES.find((s) => s.key === key)?.color;
}

/** Prioritaeten der Recommendations (kritisch -> niedrig). */
export const RECOMMENDATION_PRIORITIES = [
  { key: "critical", label: "Kritisch", color: "red" },
  { key: "high", label: "Hoch", color: "amber" },
  { key: "medium", label: "Mittel", color: "blue" },
  { key: "low", label: "Niedrig", color: "gray" },
] as const;
export const RECOMMENDATION_PRIORITY_KEYS = RECOMMENDATION_PRIORITIES.map((t) => t.key) as [
  (typeof RECOMMENDATION_PRIORITIES)[number]["key"],
  ...(typeof RECOMMENDATION_PRIORITIES)[number]["key"][],
];
export type RecommendationPriority = (typeof RECOMMENDATION_PRIORITY_KEYS)[number];
export const RECOMMENDATION_PRIORITY_LABELS = labelMap(RECOMMENDATION_PRIORITIES);
export function recommendationPriorityColor(key: string): string | undefined {
  return RECOMMENDATION_PRIORITIES.find((s) => s.key === key)?.color;
}
const RECOMMENDATION_PRIORITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};
export function recommendationPriorityRank(key: string): number {
  return RECOMMENDATION_PRIORITY_RANK[key] ?? 4;
}

/** Status einer Recommendation. */
export const RECOMMENDATION_STATUSES = [
  { key: "open", label: "Offen", color: "blue" },
  { key: "done", label: "Erledigt", color: "green" },
  { key: "snoozed", label: "Zurueckgestellt", color: "amber" },
  { key: "dismissed", label: "Verworfen", color: "gray" },
] as const;
export const RECOMMENDATION_STATUS_KEYS = RECOMMENDATION_STATUSES.map((t) => t.key) as [
  (typeof RECOMMENDATION_STATUSES)[number]["key"],
  ...(typeof RECOMMENDATION_STATUSES)[number]["key"][],
];
export type RecommendationStatus = (typeof RECOMMENDATION_STATUS_KEYS)[number];
export const RECOMMENDATION_STATUS_LABELS = labelMap(RECOMMENDATION_STATUSES);
export function recommendationStatusColor(key: string): string | undefined {
  return RECOMMENDATION_STATUSES.find((s) => s.key === key)?.color;
}

/** Status einer Orchestrierungs-Regel. */
export const ORCHESTRATION_STATUSES = [
  { key: "active", label: "Aktiv", color: "green" },
  { key: "paused", label: "Pausiert", color: "amber" },
  { key: "inactive", label: "Inaktiv", color: "gray" },
] as const;
export const ORCHESTRATION_STATUS_KEYS = ORCHESTRATION_STATUSES.map((t) => t.key) as [
  (typeof ORCHESTRATION_STATUSES)[number]["key"],
  ...(typeof ORCHESTRATION_STATUSES)[number]["key"][],
];
export type OrchestrationStatus = (typeof ORCHESTRATION_STATUS_KEYS)[number];
export const ORCHESTRATION_STATUS_LABELS = labelMap(ORCHESTRATION_STATUSES);
export function orchestrationStatusColor(key: string): string | undefined {
  return ORCHESTRATION_STATUSES.find((s) => s.key === key)?.color;
}

/** Growth-Score-Stufe (0-100) -> Label + Farbton. */
export function growthScoreLevel(score: number): { label: string; tone: StatusColor } {
  if (score >= 85) return { label: "Sehr hoch", tone: "green" };
  if (score >= 70) return { label: "Hoch", tone: "green" };
  if (score >= 50) return { label: "Mittel", tone: "blue" };
  if (score >= 30) return { label: "Niedrig", tone: "amber" };
  return { label: "Sehr niedrig", tone: "gray" };
}

/** Next-Best-Action-Katalog (Typ -> Label). Reiner Vorschlag, keine Automatik. */
export const NEXT_BEST_ACTIONS = [
  { key: "create_audit", label: "Audit erstellen" },
  { key: "prepare_outreach", label: "Outreach vorbereiten" },
  { key: "contact_lead", label: "Lead kontaktieren" },
  { key: "book_meeting", label: "Termin buchen" },
  { key: "create_proposal", label: "Proposal erstellen" },
  { key: "send_followup", label: "Follow-Up senden" },
  { key: "start_onboarding", label: "Onboarding starten" },
  { key: "schedule_reporting", label: "Reporting-Call planen" },
  { key: "reconnect_client", label: "Kontakt aufnehmen" },
  { key: "offer_upsell", label: "Upsell anbieten" },
  { key: "request_review", label: "Bewertung anfragen" },
  { key: "request_referral", label: "Empfehlung anfragen" },
  { key: "prepare_renewal", label: "Verlaengerung vorbereiten" },
  { key: "handle_churn", label: "Churn-Risiko bearbeiten" },
  { key: "monitor", label: "Beobachten" },
] as const;
export const NEXT_BEST_ACTION_KEYS = NEXT_BEST_ACTIONS.map((t) => t.key) as [
  (typeof NEXT_BEST_ACTIONS)[number]["key"],
  ...(typeof NEXT_BEST_ACTIONS)[number]["key"][],
];
export type NextBestActionKey = (typeof NEXT_BEST_ACTION_KEYS)[number];
export const NEXT_BEST_ACTION_LABELS = labelMap(NEXT_BEST_ACTIONS);

/** Standard-Fragen fuers AI-Assistant-Panel (datenbasiert beantwortet). */
export const ASSISTANT_QUESTIONS = [
  { key: "leads_to_call", label: "Welche Leads sollte Fabian heute anrufen?" },
  { key: "upsell_clients", label: "Welche Kunden haben Upsell-Potenzial?" },
  { key: "expiring_contracts", label: "Welche Vertraege laufen bald aus?" },
  { key: "critical_projects", label: "Welche Projekte sind kritisch?" },
] as const;
export const ASSISTANT_QUESTION_KEYS = ASSISTANT_QUESTIONS.map((t) => t.key) as [
  (typeof ASSISTANT_QUESTIONS)[number]["key"],
  ...(typeof ASSISTANT_QUESTIONS)[number]["key"][],
];
export type AssistantQuestionKey = (typeof ASSISTANT_QUESTION_KEYS)[number];
export const ASSISTANT_QUESTION_LABELS = labelMap(ASSISTANT_QUESTIONS);
