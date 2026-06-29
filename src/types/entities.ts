/**
 * Datenbank-Zeilentypen (Row-Types) der Kern-Business-Entitaeten (Phase 2).
 * Spiegelt das Schema aus `supabase/migrations/0002_core_business_entities.sql`.
 * Status-/Typ-Unions stammen aus `@/config/catalog` (Single Source of Truth).
 */
import type {
  ClientStatus,
  ProjectStatus,
  OfferStatus,
  ContractStatus,
  Priority,
  ProjectType,
  ContractType,
  RenewalType,
  CompanyType,
  FileCategory,
  LeadStatus,
  LeadSource,
  CompanySize,
  OfferType,
  MeetingStatus,
  ReportingCallStatus,
  ClientInteractionType,
  WebsiteProjectStatus,
  AdProjectStatus,
  CrmProjectStatus,
  ContentProjectStatus,
  ShootStatus,
  ApprovalStatus,
  CreatorStatus,
  ShootAssignmentStatus,
  InvoiceStatus,
  OutreachMessageStatus,
  BookedMeetingStatus,
  ProposalStatus,
} from "@/config/catalog";

/** Gemeinsame Felder jeder fachlichen Tabelle. */
export interface BaseEntity {
  id: string;
  org_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** Basis + wer-hat-erstellt/geaendert. */
export interface AuditedEntity extends BaseEntity {
  created_by: string | null;
  updated_by: string | null;
}

export interface Client extends AuditedEntity {
  name: string;
  company_type: CompanyType | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  industry: string | null;
  status: ClientStatus;
  account_manager_id: string | null;
  start_date: string | null;
  notes: string | null;
  package: string | null;
}

export interface Contact extends AuditedEntity {
  client_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  position: string | null;
  is_primary: boolean;
  notes: string | null;
}

export interface Project extends AuditedEntity {
  client_id: string | null;
  title: string;
  description: string | null;
  project_type: ProjectType;
  status: ProjectStatus;
  priority: Priority;
  start_date: string | null;
  due_date: string | null;
  owner_id: string | null;
}

export interface FileRecord extends BaseEntity {
  client_id: string | null;
  project_id: string | null;
  uploaded_by: string | null;
  updated_by: string | null;
  filename: string;
  file_url: string;
  mime_type: string | null;
  size: number | null;
  category: FileCategory | null;
}

export interface MeetingParticipant {
  name: string;
  email?: string;
}

export interface Meeting extends AuditedEntity {
  client_id: string | null;
  lead_id: string | null;
  title: string;
  meeting_type: string | null;
  meeting_date: string | null;
  duration_minutes: number | null;
  status: MeetingStatus;
  participants: MeetingParticipant[];
  notes: string | null;
  decisions: string | null;
  next_steps: string | null;
  recording_url: string | null;
  transcript: string | null;
  summary: string | null;
  action_items: string | null;
}

export interface Contract extends AuditedEntity {
  client_id: string;
  title: string;
  contract_type: ContractType | null;
  start_date: string | null;
  end_date: string | null;
  renewal_type: RenewalType | null;
  cancellation_notice_days: number | null;
  /** Monatswert in Rappen. */
  value_monthly: number | null;
  /** Gesamtwert in Rappen. */
  value_total: number | null;
  currency: string;
  status: ContractStatus;
  document_url: string | null;
  offer_id: string | null;
}

/* --------------------------------------------------------------------------
 * Phase 4 - Sales CRM
 * ------------------------------------------------------------------------ */

export interface Lead extends AuditedEntity {
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  company_size: CompanySize | null;
  city: string | null;
  country: string | null;
  source: LeadSource | null;
  lead_score: number;
  /** geschaetzter Wert in Rappen. */
  estimated_value: number | null;
  currency: string;
  status_id: string;
  owner_id: string | null;
  notes: string | null;
  next_action_date: string | null;
  /** Import / Ad-Lead-Felder (optional, aus altem CRM bzw. Meta Lead Ads). */
  legacy_status?: string | null;
  campaign_name?: string | null;
  dienstleistung?: string | null;
  assigned_to_name?: string | null;
  assigned_to_email?: string | null;
  external_lead_id?: string | null;
  form_id?: string | null;
  form_name?: string | null;
  ad_id?: string | null;
  ad_name?: string | null;
  adset_id?: string | null;
  adset_name?: string | null;
  campaign_id?: string | null;
  /** Vollstaendige Rohdaten/Formularfelder (alter CRM-Import bzw. Meta Lead Ads). */
  metadata_json?: Record<string, unknown> | null;
}

export interface LeadWithRelations extends Lead {
  status: StatusMini | null;
  owner: ProfileMini | null;
}

export interface SalesActivity {
  id: string;
  org_id: string;
  lead_id: string;
  type: string;
  subject: string | null;
  body: string | null;
  activity_date: string;
  created_by: string | null;
  created_at: string;
  author?: ProfileMini | null;
  lead?: { id: string; company_name: string } | null;
}

/** Meeting mit aufgeloestem Lead/Kunde (Sales-Termin-Ansicht). */
export interface SalesMeetingRow extends Meeting {
  lead: { id: string; company_name: string } | null;
  client: { id: string; name: string } | null;
}

/* --------------------------------------------------------------------------
 * Phase 5 - Client Management
 * ------------------------------------------------------------------------ */

export interface ReportingCall extends AuditedEntity {
  client_id: string;
  owner_id: string | null;
  scheduled_date: string | null;
  status: ReportingCallStatus;
  meeting_link: string | null;
  agenda: string | null;
  topics: string | null;
  results: string | null;
  challenges: string | null;
  notes: string | null;
  summary: string | null;
  next_steps: string | null;
  responsibilities: string | null;
}

export interface ReportingCallWithRelations extends ReportingCall {
  client: ClientMini | null;
  owner: ProfileMini | null;
}

export interface ClientInteraction {
  id: string;
  org_id: string;
  client_id: string;
  type: ClientInteractionType | string;
  subject: string | null;
  body: string | null;
  interaction_date: string;
  created_by: string | null;
  created_at: string;
  author?: ProfileMini | null;
}

export interface ClientChecklistItem {
  id: string;
  checklist_id: string;
  title: string;
  completed: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface ClientChecklist {
  id: string;
  org_id: string;
  client_id: string;
  kind: string;
  created_by: string | null;
  created_at: string;
  items?: ClientChecklistItem[];
}

export type ClientWarningSeverity = "info" | "warn" | "danger";
export interface ClientWarning {
  type: string;
  label: string;
  severity: ClientWarningSeverity;
}

/** Kunde angereichert mit Customer-Success-Kennzahlen + Warnungen. */
export interface ClientWithStats extends Client {
  mrr: number; // Rappen (Summe aktiver Verträge)
  open_tasks: number;
  last_contact: string | null;
  next_reporting: string | null;
  account_manager: ProfileMini | null;
  warnings: ClientWarning[];
}

export interface Offer extends AuditedEntity {
  client_id: string | null;
  lead_id: string | null;
  title: string;
  offer_type: OfferType | null;
  /** Betrag in Rappen. */
  amount: number | null;
  currency: string;
  status: OfferStatus;
  sent_date: string | null;
  accepted_date: string | null;
  valid_until: string | null;
  owner_id: string | null;
  pdf_url: string | null;
}

/** Registry-Zeilen (statuses / priorities). */
export interface StatusRow {
  id: string;
  entity_type: string;
  key: string;
  label: string;
  color: string | null;
  sort_order: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

export interface PriorityRow {
  id: string;
  key: string;
  label: string;
  level: number;
  color: string | null;
  sort_order: number;
  is_default: boolean;
  created_at: string;
}

/* --------------------------------------------------------------------------
 * Phase 3 - Task-System
 * ------------------------------------------------------------------------ */

export interface Task extends AuditedEntity {
  title: string;
  description: string | null;
  client_id: string | null;
  project_id: string | null;
  lead_id: string | null;
  assigned_to: string | null;
  status_id: string;
  priority_id: string | null;
  due_date: string | null;
  start_date: string | null;
  completed_at: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  tags: string[];
  position: number;
}

/** Schlanke eingebettete Referenzen fuer Board/Tabelle/Detail. */
export interface StatusMini {
  key: string;
  label: string;
  color: string | null;
}
export interface PriorityMini {
  key: string;
  label: string;
  color: string | null;
  level: number;
}
export interface ProfileMini {
  id: string;
  full_name: string | null;
}
export interface ClientMini {
  id: string;
  name: string;
}
export interface ProjectMini {
  id: string;
  title: string;
}

/** Task inkl. aufgeloester Beziehungen + Fortschrittszahlen. */
export interface TaskWithRelations extends Task {
  status: StatusMini | null;
  priority: PriorityMini | null;
  assignee: ProfileMini | null;
  client: ClientMini | null;
  project: ProjectMini | null;
  subtask_total: number;
  subtask_done: number;
  comment_count: number;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string | null;
  comment: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  author?: ProfileMini | null;
}

export interface TaskActivity {
  id: string;
  task_id: string;
  user_id: string | null;
  action: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  actor?: ProfileMini | null;
}

export interface TaskTemplate {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  project_type: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  items?: TaskTemplateItem[];
}

export interface TaskTemplateItem {
  id: string;
  template_id: string;
  title: string;
  description: string | null;
  order_index: number;
  priority_key: string | null;
  due_offset_days: number | null;
  created_at: string;
}

export interface Notification {
  id: string;
  org_id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

/* --------------------------------------------------------------------------
 * Phase 6 - Production Hub
 * ------------------------------------------------------------------------ */

export interface WebsiteProject extends AuditedEntity {
  client_id: string | null;
  project_id: string | null;
  title: string | null;
  domain: string | null;
  cms: string | null;
  hosting: string | null;
  seo_status: string | null;
  tracking_status: string | null;
  launch_date: string | null;
  owner_id: string | null;
  status: WebsiteProjectStatus;
}

export interface AdProject extends AuditedEntity {
  client_id: string | null;
  project_id: string | null;
  title: string | null;
  platform: string | null;
  /** Monatliches Budget in Rappen. */
  budget: number | null;
  objective: string | null;
  owner_id: string | null;
  status: AdProjectStatus;
}

export interface CrmProject extends AuditedEntity {
  client_id: string | null;
  project_id: string | null;
  title: string | null;
  crm_type: string | null;
  go_live_date: string | null;
  owner_id: string | null;
  status: CrmProjectStatus;
}

export interface ContentProject extends AuditedEntity {
  client_id: string | null;
  project_id: string | null;
  title: string | null;
  content_type: string | null;
  platform: string | null;
  owner_id: string | null;
  status: ContentProjectStatus;
}

/** Gemeinsame Beziehungen der spezialisierten Projektarten. */
export interface ProductionRelations {
  client: ClientMini | null;
  owner: ProfileMini | null;
}
export type WebsiteProjectWithRelations = WebsiteProject & ProductionRelations;
export type AdProjectWithRelations = AdProject & ProductionRelations;
export type CrmProjectWithRelations = CrmProject & ProductionRelations;
export type ContentProjectWithRelations = ContentProject & ProductionRelations;

export interface Shoot extends AuditedEntity {
  client_id: string | null;
  content_project_id: string | null;
  title: string;
  shooting_date: string | null;
  location: string | null;
  videographer: string | null;
  status: ShootStatus;
  notes: string | null;
}
export interface ShootWithRelations extends Shoot {
  client: ClientMini | null;
  content_project: { id: string; title: string | null } | null;
}

export interface Asset extends BaseEntity {
  client_id: string | null;
  project_id: string | null;
  title: string | null;
  category: string | null;
  file_url: string | null;
  tags: string[];
  uploaded_by: string | null;
  updated_by: string | null;
}
export interface AssetWithRelations extends Asset {
  client: ClientMini | null;
  uploader: ProfileMini | null;
}

export interface Approval extends AuditedEntity {
  client_id: string | null;
  project_id: string | null;
  asset_id: string | null;
  title: string | null;
  status: ApprovalStatus;
  notes: string | null;
  requested_at: string;
  approved_at: string | null;
}
export interface ApprovalWithRelations extends Approval {
  client: ClientMini | null;
  asset: { id: string; title: string | null; file_url: string | null } | null;
}

export interface ProjectMilestone {
  id: string;
  org_id: string;
  project_id: string;
  title: string;
  due_date: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

/** Vereinheitlichtes Kalender-Ereignis (Shootings, Launches, Go-Lives ...). */
export interface ProductionCalendarEvent {
  id: string;
  date: string;
  type: "shoot" | "launch" | "go_live" | "milestone" | "reporting";
  title: string;
  href: string;
  clientName: string | null;
}

/** Auslastungs-Zeile je Mitarbeiter (Team-Auslastung). */
export interface WorkloadRow {
  user: ProfileMini;
  openTasks: number;
  projects: number;
  estimatedHours: number;
  actualHours: number;
}

/* --------------------------------------------------------------------------
 * Phase 7 - Creator Pool
 * ------------------------------------------------------------------------ */

export interface Creator extends AuditedEntity {
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  canton: string | null;
  country: string | null;
  birth_year: number | null;
  gender: string | null;
  languages: string[];
  instagram_handle: string | null;
  instagram_followers: number | null;
  tiktok_handle: string | null;
  tiktok_followers: number | null;
  creator_types: string[];
  experience_level: string | null;
  /** Preise in Rappen. */
  hourly_rate: number | null;
  half_day_rate: number | null;
  full_day_rate: number | null;
  travel_costs: number | null;
  additional_costs: number | null;
  travel_available: boolean;
  status: CreatorStatus;
  score: number;
  creator_group_status: string;
  tags: string[];
  consent_given: boolean;
  consent_date: string | null;
  consent_note: string | null;
  notes: string | null;
}

/** Creator angereichert mit Bewertungs-/Buchungs-Kennzahlen. */
export interface CreatorWithStats extends Creator {
  rating_avg: number | null;
  rating_count: number;
  shoot_count: number;
  last_booked: string | null;
}

export interface CreatorAsset extends BaseEntity {
  creator_id: string;
  title: string | null;
  category: string | null;
  file_url: string | null;
  tags: string[];
  uploaded_by: string | null;
  updated_by: string | null;
}

export interface CreatorAvailability {
  id: string;
  org_id: string;
  creator_id: string;
  start_date: string;
  end_date: string | null;
  availability_type: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CreatorRating {
  id: string;
  org_id: string;
  creator_id: string;
  shoot_id: string | null;
  punctuality: number | null;
  appearance: number | null;
  camera_quality: number | null;
  communication: number | null;
  professionalism: number | null;
  overall: number | null;
  comment: string | null;
  created_by: string | null;
  created_at: string;
  author?: ProfileMini | null;
}

export interface ShootAssignment extends AuditedEntity {
  shoot_id: string;
  creator_id: string;
  status: ShootAssignmentStatus;
  agreed_rate: number | null;
  note: string | null;
}

export interface CreatorMini {
  id: string;
  first_name: string;
  last_name: string | null;
}

export interface ShootAssignmentWithRelations extends ShootAssignment {
  creator: CreatorMini | null;
  shoot: { id: string; title: string; shooting_date: string | null } | null;
}

/** Matching-Treffer: Creator + berechneter Relevanz-Score (0-100) + Aufschluesselung. */
export interface CreatorMatch {
  creator: CreatorWithStats;
  matchScore: number;
  breakdown: Record<string, number>;
}

/** Kriterien fuer die Matching-Engine. */
export interface MatchCriteria {
  canton?: string | null;
  city?: string | null;
  creatorType?: string | null;
  experienceLevel?: string | null;
  language?: string | null;
  /** Budget in Rappen (relevanter Tagessatz). */
  maxBudget?: number | null;
  /** Datum fuer Verfuegbarkeitspruefung (YYYY-MM-DD). */
  date?: string | null;
  minScore?: number | null;
}

/* --------------------------------------------------------------------------
 * Phase 8 - Finance
 * ------------------------------------------------------------------------ */

export interface Invoice extends AuditedEntity {
  client_id: string | null;
  invoice_number: string | null;
  title: string | null;
  /** Nettobetrag in Rappen. */
  amount: number | null;
  /** MWST-Betrag in Rappen. */
  vat: number | null;
  due_date: string | null;
  paid_date: string | null;
  status: InvoiceStatus;
  pdf_url: string | null;
  notes: string | null;
}
export interface InvoiceWithClient extends Invoice {
  client: ClientMini | null;
}

export interface Expense extends AuditedEntity {
  title: string;
  category: string | null;
  /** Betrag in Rappen. */
  amount: number | null;
  recurring: boolean;
  recurring_frequency: string | null;
  date: string | null;
  notes: string | null;
}

/** Manuelle Monatsfinanzen: ein Umsatz- oder Kostenposten in einem Monat. */
export interface MonthlyEntry extends AuditedEntity {
  /** Erster Tag des Monats (YYYY-MM-01). */
  month: string;
  kind: "revenue" | "cost";
  label: string;
  /** Betrag in Rappen. */
  amount: number;
  category: string | null;
  note: string | null;
  sort_order: number;
}

/** Finance-Dashboard-Kennzahlen (alle Geldwerte in Rappen). */
export interface FinanceSummary {
  monthRevenue: number;
  yearRevenue: number;
  mrr: number;
  arr: number;
  openInvoicesCount: number;
  openInvoicesAmount: number;
  overdueInvoicesCount: number;
  overdueInvoicesAmount: number;
  profitEstimateMonth: number;
  activeClients: number;
  forecastNextMonth: number;
  forecast3Months: number;
  forecast12Months: number;
}

/** Ein Forecast-Monat (Rappen). */
export interface ForecastMonth {
  month: string; // YYYY-MM
  revenue: number;
  cost: number;
  profit: number;
}

/** Kundenwert / Profitabilitaet je Kunde. */
export interface CustomerValue {
  client: ClientMini;
  totalRevenue: number; // bezahlte Rechnungen (Rappen)
  mrr: number;
  runtimeMonths: number;
  avgMonthly: number;
  openAmount: number;
}

export type FinanceAlertSeverity = "info" | "warn" | "danger";
export interface FinanceAlert {
  type: string;
  label: string;
  severity: FinanceAlertSeverity;
  href?: string;
}

export interface FinanceCalendarEvent {
  id: string;
  date: string;
  type: "invoice_due" | "contract_end" | "renewal";
  title: string;
  href: string;
  clientName: string | null;
  amount: number | null;
}

/** Generischer Zeitreihen-Punkt (Monat -> Wert in Rappen). */
export interface FinanceSeriesPoint {
  month: string; // YYYY-MM
  value: number;
}

/* --------------------------------------------------------------------------
 * Phase 9 - AI & Automation Layer
 * ------------------------------------------------------------------------ */

export interface AiPrompt extends AuditedEntity {
  name: string;
  category: string | null;
  description: string | null;
  system_prompt: string | null;
  user_prompt_template: string | null;
  /** Liste der Variablennamen, z.B. ["company_name", "website_url"]. */
  variables: string[];
  model: string | null;
  temperature: number;
  status: string; // active/inactive
}

export interface AiRun {
  id: string;
  org_id: string;
  prompt_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  input_data: Record<string, unknown> | null;
  output_data: Record<string, unknown> | null;
  model: string | null;
  status: string;
  error_message: string | null;
  token_usage: number | null;
  cost_estimate: number | null;
  created_by: string | null;
  created_at: string;
  prompt?: { id: string; name: string } | null;
}

export interface AutomationJob extends AuditedEntity {
  name: string;
  type: string | null;
  status: string; // active/paused/inactive
  schedule: string | null;
  last_run_at: string | null;
  next_run_at: string | null;
  config: Record<string, unknown>;
}

export interface AutomationRun {
  id: string;
  org_id: string;
  job_id: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  result: Record<string, unknown> | null;
  error_message: string | null;
  logs: string | null;
  created_at: string;
  job?: { id: string; name: string } | null;
}

/** Integration-Zeile (DB). `encrypted_credentials` wird NIE ans Frontend gegeben. */
export interface Integration {
  id: string;
  org_id: string;
  name: string;
  provider: string | null;
  status: string;
  config: Record<string, unknown>;
  encrypted_credentials: string | null;
  created_at: string;
  updated_at: string;
}

/** UI-sichere Integration: ohne Secret, nur Flag ob Credentials vorhanden. */
export interface IntegrationSafe {
  id: string;
  name: string;
  provider: string | null;
  status: string;
  config: Record<string, unknown>;
  has_credentials: boolean;
  created_at: string;
  updated_at: string;
}

export interface Webhook {
  id: string;
  org_id: string;
  name: string;
  provider: string | null;
  endpoint_url: string | null;
  status: string;
  /** Secret wird in der UI maskiert. */
  secret: string | null;
  last_received_at: string | null;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/* --------------------------------------------------------------------------
 * Phase 10 - Lead Engine
 * ------------------------------------------------------------------------ */

/** Discovery-Quelle (Tabelle lead_sources). */
export interface LeadSourceRow {
  id: string;
  org_id: string;
  name: string;
  source_type: string | null;
  status: string;
  config: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadDiscoveryRun {
  id: string;
  org_id: string;
  source_id: string | null;
  status: string;
  started_at: string;
  finished_at: string | null;
  leads_found: number;
  logs: string | null;
  created_at: string;
  source?: { id: string; name: string } | null;
}

/** Website-Scan-Struktur (keine tiefe Analyse). */
export interface WebsiteScan {
  has_website?: boolean;
  https?: boolean;
  mobile_friendly?: boolean;
  load_time_ms?: number;
  has_contact_form?: boolean;
  has_cta?: boolean;
  has_social_links?: boolean;
  has_imprint?: boolean;
  has_tracking?: boolean;
}

export interface LeadCompany extends AuditedEntity {
  name: string;
  industry: string | null;
  website: string | null;
  domain: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  canton: string | null;
  country: string | null;
  contact_name: string | null;
  source_id: string | null;
  website_scan: WebsiteScan;
  website_score: number;
  ads_score: number;
  content_score: number;
  recruiting_score: number;
  crm_score: number;
  overall_score: number;
  watchlist_status: string;
  handed_over: boolean;
  handed_over_lead_id: string | null;
  handed_over_at: string | null;
  last_analyzed_at: string | null;
  notes: string | null;
}

export interface LeadCompanyWithStats extends LeadCompany {
  opportunity_count: number;
  source: { id: string; name: string } | null;
}

export interface LeadOpportunity {
  id: string;
  org_id: string;
  lead_company_id: string;
  opportunity_type: string | null;
  score: number;
  findings: string | null;
  recommendations: string | null;
  created_at: string;
}

/** Lead-Engine-Dashboard-Kennzahlen. */
export interface LeadEngineDashboard {
  newToday: number;
  newThisWeek: number;
  total: number;
  hotCount: number;
  handedOver: number;
  byCanton: { canton: string; count: number }[];
  byIndustry: { industry: string; count: number }[];
  topOpportunities: LeadCompanyWithStats[];
  websiteOpps: number;
  adsOpps: number;
  crmOpps: number;
}

/* --------------------------------------------------------------------------
 * Phase 11 - Outreach Engine
 * ------------------------------------------------------------------------ */

export interface OutreachCampaign {
  id: string;
  org_id: string;
  name: string;
  campaign_type: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  org_id: string;
  name: string;
  category: string | null;
  subject: string | null;
  body: string | null;
  variables: string[];
  active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutreachContact {
  id: string;
  org_id: string;
  lead_id: string | null;
  email: string | null;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  status: string;
  last_contacted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutreachMessage extends AuditedEntity {
  lead_id: string | null;
  campaign_id: string | null;
  template_id: string | null;
  subject: string | null;
  body: string | null;
  status: OutreachMessageStatus;
  sent_at: string | null;
  opened_at: string | null;
  replied_at: string | null;
}
export interface OutreachMessageWithRelations extends OutreachMessage {
  lead: { id: string; company_name: string } | null;
  campaign: { id: string; name: string } | null;
}

export interface FollowUpStep {
  day: number;
  label: string;
}
export interface FollowUpSequence {
  id: string;
  org_id: string;
  name: string;
  active: boolean;
  description: string | null;
  steps: FollowUpStep[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookedMeeting extends AuditedEntity {
  lead_id: string | null;
  title: string | null;
  date: string | null;
  status: BookedMeetingStatus;
  source: string | null;
  notes: string | null;
}
export interface BookedMeetingWithRelations extends BookedMeeting {
  lead: { id: string; company_name: string } | null;
}

export interface Unsubscribe {
  id: string;
  org_id: string;
  email: string;
  reason: string | null;
  unsubscribed_at: string;
  created_at: string;
}

/** Outreach-Dashboard-Kennzahlen. */
export interface OutreachDashboard {
  drafts: number;
  sent: number;
  replies: number;
  positive: number;
  followupsDue: number;
  meetings: number;
  replyRate: number;
  positiveRate: number;
  meetingRate: number;
}

/* --------------------------------------------------------------------------
 * Phase 12 - Website Audit Engine
 * ------------------------------------------------------------------------ */

export interface WebsiteAudit extends AuditedEntity {
  lead_company_id: string | null;
  url: string | null;
  status: string;
  design_score: number;
  conversion_score: number;
  seo_score: number;
  trust_score: number;
  performance_score: number;
  mobile_score: number;
  content_score: number;
  tracking_score: number;
  overall_score: number;
  executive_summary: string | null;
  top_problems: string[];
  quick_wins: string[];
  sales_opportunity: string | null;
  generated_at: string | null;
}
export interface WebsiteAuditWithRelations extends WebsiteAudit {
  company: { id: string; name: string } | null;
}

export interface AuditFinding {
  id: string;
  org_id: string;
  audit_id: string;
  category: string | null;
  severity: string | null;
  title: string | null;
  description: string | null;
  recommendation: string | null;
  created_at: string;
}

export interface AuditOpportunity {
  id: string;
  org_id: string;
  audit_id: string;
  opportunity_type: string | null;
  score: number;
  reason: string | null;
  recommendation: string | null;
  created_at: string;
}

export interface WebsiteAuditDetail extends WebsiteAuditWithRelations {
  findings: AuditFinding[];
  opportunities: AuditOpportunity[];
}

/** Audit-Dashboard-Kennzahlen. */
export interface AuditDashboard {
  newThisWeek: number;
  total: number;
  avgScore: number;
  weakSites: number;
  hotChances: number;
  topOpportunities: WebsiteAuditWithRelations[];
}

/** Audit-Kategorie-Score (fuer Anzeige). */
export interface AuditCategoryScore {
  key: string;
  label: string;
  score: number;
}

/* --------------------------------------------------------------------------
 * Phase 13 - Proposal Engine
 * ------------------------------------------------------------------------ */

export interface PricingItem {
  id: string;
  org_id: string;
  name: string;
  category: string | null;
  unit_price: number | null;
  recurring: boolean;
  active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Proposal extends AuditedEntity {
  lead_id: string | null;
  client_id: string | null;
  title: string;
  proposal_type: string | null;
  status: ProposalStatus;
  amount: number | null;
  monthly_amount: number | null;
  setup_fee: number | null;
  contract_duration_months: number | null;
  version: number;
  parent_id: string | null;
  situation: string | null;
  goal: string | null;
  solution: string | null;
  next_steps: string | null;
  contract_start_date: string | null;
  payment_terms: string | null;
  cancellation_terms: string | null;
  pdf_url: string | null;
  presentation_url: string | null;
  contract_url: string | null;
  invoice_id: string | null;
}
export interface ProposalWithRelations extends Proposal {
  lead: { id: string; company_name: string } | null;
  client: { id: string; name: string } | null;
}

export interface ProposalItem {
  id: string;
  org_id: string;
  proposal_id: string;
  title: string;
  description: string | null;
  quantity: number;
  unit_price: number | null;
  total_price: number | null;
  recurring: boolean;
  category: string | null;
  order_index: number;
  created_at: string;
}

export interface ProposalDetail extends ProposalWithRelations {
  items: ProposalItem[];
  versions: { id: string; version: number; status: string; created_at: string }[];
}

/** Proposal-Dashboard-Kennzahlen (Geldwerte in Rappen). */
export interface ProposalDashboard {
  drafts: number;
  review: number;
  sent: number;
  accepted: number;
  openContracts: number;
  volume: number;
  winRate: number;
}

/* --------------------------------------------------------------------------
 * Phase 14 - Knowledge Base, Meeting Assistant & SOPs
 * ------------------------------------------------------------------------ */

export interface MeetingWithRelations extends Meeting {
  client: { id: string; name: string } | null;
  lead: { id: string; company_name: string } | null;
}

export interface KnowledgeArticle {
  id: string;
  org_id: string;
  title: string;
  content: string | null;
  category: string | null;
  tags: string[];
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SopStep {
  title: string;
  description?: string;
}
export interface Sop {
  id: string;
  org_id: string;
  title: string;
  category: string | null;
  steps: SopStep[];
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PromptLibraryItem {
  id: string;
  org_id: string;
  title: string;
  category: string | null;
  prompt: string | null;
  variables: string[];
  tags: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Globales Suchergebnis ueber alle Wissensquellen. */
export interface KnowledgeSearchResults {
  meetings: { id: string; title: string; meeting_date: string | null }[];
  articles: { id: string; title: string; category: string | null }[];
  sops: { id: string; title: string; category: string | null }[];
  prompts: { id: string; title: string; category: string | null }[];
}

/* --------------------------------------------------------------------------
 * Phase 15 - Executive Command Center
 * ------------------------------------------------------------------------ */

export interface ExecutiveAlert {
  id: string;
  org_id: string;
  category: string | null;
  severity: string | null;
  title: string;
  description: string | null;
  entity_type: string | null;
  entity_id: string | null;
  resolved: boolean;
  resolved_at: string | null;
  created_by: string | null;
  created_at: string;
}

/** Berechneter (nicht gespeicherter) Alert fuers Dashboard. */
export interface ComputedAlert {
  category: string;
  severity: string;
  title: string;
  href?: string;
}

export interface CompanyGoal {
  id: string;
  org_id: string;
  title: string;
  target_value: number | null;
  current_value: number;
  unit: string | null;
  due_date: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  owner?: ProfileMini | null;
}

/** Health-Zeile (Projekt oder Kunde). */
export interface HealthRow {
  id: string;
  name: string;
  status: { key: string; label: string; color: string };
  issues: string[];
}

/** Aggregierte CEO-Uebersicht (Geldwerte in Rappen). */
export interface ExecutiveDashboard {
  revenue: {
    mrr: number;
    arr: number;
    monthRevenue: number;
    yearRevenue: number;
    forecast3: number;
    forecast12: number;
  };
  sales: {
    leadsThisWeek: number;
    pipelineValue: number;
    openOffers: number;
    winRate: number;
    hotLeads: number;
  };
  clients: {
    active: number;
    noContact: number;
    contractsExpiring: number;
    churnRisk: number;
  };
  production: {
    atRisk: number;
    overdue: number;
    openApprovals: number;
    shootsThisWeek: number;
  };
  team: {
    openTasks: number;
    overloaded: number;
    topLoad: WorkloadRow[];
  };
  alerts: ComputedAlert[];
}

/** Tagesbriefing (generiert). */
export interface MorningBriefing {
  headline: string;
  numbers: { label: string; value: string }[];
  risks: string[];
  hotLeads: string[];
  problems: string[];
}

/** Wochen-CEO-Report (generiert). */
export interface WeeklyReport {
  headline: string;
  revenue: { label: string; value: string }[];
  highlights: string[];
  risks: string[];
}

/* --------------------------------------------------------------------------
 * Phase 16 - Growth Engine
 * ------------------------------------------------------------------------ */

interface GrowthClientRef {
  client: { id: string; name: string } | null;
}

export interface UpsellOpportunity {
  id: string;
  org_id: string;
  client_id: string;
  opportunity_type: string | null;
  score: number;
  reason: string | null;
  recommendation: string | null;
  estimated_value: number | null;
  status: string;
  created_by: string | null;
  created_at: string;
}
export type UpsellOpportunityWithClient = UpsellOpportunity & GrowthClientRef;

export interface ReferralOpportunity {
  id: string;
  org_id: string;
  client_id: string;
  score: number;
  reason: string | null;
  status: string;
  created_at: string;
}
export type ReferralOpportunityWithClient = ReferralOpportunity & GrowthClientRef;

export interface ReviewRequest {
  id: string;
  org_id: string;
  client_id: string;
  request_date: string | null;
  status: string;
  review_url: string | null;
  created_at: string;
}
export type ReviewRequestWithClient = ReviewRequest & GrowthClientRef;

export interface Renewal {
  id: string;
  org_id: string;
  contract_id: string | null;
  client_id: string;
  renewal_score: number;
  renewal_probability: number;
  status: string;
  created_at: string;
  updated_at: string;
}
export type RenewalWithClient = Renewal & GrowthClientRef;

export interface ChurnRisk {
  id: string;
  org_id: string;
  client_id: string;
  score: number;
  reasons: string | null;
  created_at: string;
}
export type ChurnRiskWithClient = ChurnRisk & GrowthClientRef;

export interface Testimonial {
  id: string;
  org_id: string;
  client_id: string;
  type: string | null;
  status: string;
  content: string | null;
  created_at: string;
  updated_at: string;
}
export type TestimonialWithClient = Testimonial & GrowthClientRef;

/** Growth-Dashboard-Kennzahlen (Geld in Rappen). */
export interface GrowthDashboard {
  upsellCount: number;
  referralCount: number;
  renewalCount: number;
  churnCount: number;
  reviewsPending: number;
  testimonialsCount: number;
  upsellVolume: number;
  topUpsells: UpsellOpportunityWithClient[];
  topChurn: ChurnRiskWithClient[];
}

/** Growth-Timeline-Eintrag je Kunde. */
export interface GrowthTimelineItem {
  kind: "upsell" | "referral" | "review" | "renewal" | "churn" | "testimonial";
  label: string;
  status: string;
  score?: number;
  created_at: string;
}

/* --------------------------------------------------------------------------
 * Phase 17 - Autonomous Growth Engine (Orchestrierungsschicht)
 * ------------------------------------------------------------------------ */

export interface RevenueJourney {
  id: string;
  org_id: string;
  lead_id: string | null;
  client_id: string | null;
  current_stage: string;
  next_recommended_action: string | null;
  estimated_value: number | null; // Rappen
  owner_id: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
export interface RevenueJourneyWithRefs extends RevenueJourney {
  lead: { id: string; company_name: string } | null;
  client: { id: string; name: string } | null;
  owner: ProfileMini | null;
}

export interface GrowthRecommendation {
  id: string;
  org_id: string;
  entity_type: string;
  entity_id: string | null;
  title: string;
  recommendation: string | null;
  reason: string | null;
  priority: string; // RecommendationPriority
  estimated_value: number | null; // Rappen
  href: string | null;
  status: string; // RecommendationStatus
  created_by: string | null;
  created_at: string;
}

export interface AutomationOrchestration {
  id: string;
  org_id: string;
  name: string;
  trigger: string;
  action: string;
  description: string | null;
  status: string; // OrchestrationStatus
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GrowthAlert {
  id: string;
  org_id: string;
  severity: string;
  title: string;
  description: string | null;
  entity_type: string | null;
  entity_id: string | null;
  resolved: boolean;
  resolved_at: string | null;
  created_by: string | null;
  created_at: string;
}

/** Eine berechnete naechste-beste-Aktion (nicht zwingend gespeichert). */
export interface NextBestAction {
  action: string; // NextBestActionKey
  label: string;
  priority: string; // RecommendationPriority
  reason: string;
  href?: string;
  estimatedValue?: number | null;
}

/** KPI-Widgets der Growth Engine (Geld in Rappen). */
export interface GrowthKpis {
  pipelineValue: number;
  forecast: number; // 3-Monats-Forecast (Rappen)
  upsellValue: number;
  referralPotential: number;
  renewalPotential: number;
  churnRisk: number; // Anzahl gefaehrdeter Kunden
}

/** Aufschluesselung des Pipeline-Werts (Rappen). */
export interface PipelineValue {
  leadValue: number;
  proposalValue: number;
  renewalValue: number;
  upsellValue: number;
  total: number;
}

/** Growth-Dashboard: offene Posten je Funnel-Stufe + KPIs. */
export interface GrowthEngineDashboard {
  newLeads: number;
  hotOpportunities: number;
  openAudits: number;
  outreachDrafts: number;
  followupsDue: number;
  openOffers: number;
  openContracts: number;
  clientsNoContact: number;
  upsellChances: number;
  reviewsPending: number;
  openRecommendations: number;
  openAlerts: number;
  kpis: GrowthKpis;
  pipeline: PipelineValue;
}

/** Ein Funnel-Schritt mit Anzahl (Pipeline-Visualisierung). */
export interface GrowthPipelineStepCount {
  key: string;
  label: string;
  count: number;
}

/** Ein Abschnitt des Tagesbriefings. */
export interface GrowthBriefingSection {
  key: string;
  label: string;
  count: number;
  items: string[];
  href: string;
}
export interface GrowthBriefing {
  headline: string;
  sections: GrowthBriefingSection[];
}

/** Wochen-Report der Growth Engine. */
export interface GrowthWeeklyReport {
  headline: string;
  sales: { label: string; value: string }[];
  clients: { label: string; value: string }[];
  revenue: { label: string; value: string }[];
  highlights: string[];
  risks: string[];
  opportunities: string[];
}

/** Antwort des AI-Assistant-Panels (datenbasiert). */
export interface AssistantAnswerItem {
  title: string;
  subtitle?: string;
  badge?: string;
  href?: string;
}
export interface AssistantAnswer {
  question: string;
  summary: string;
  items: AssistantAnswerItem[];
}
