/**
 * Sichert alle Geschaeftsdaten als ein JSON-File (Snapshot) ueber die Supabase
 * Service-Role. Liegt unter backups/ecreator-backup-<zeitstempel>.json.
 *
 *   node scripts/backup.mjs
 *
 * Taeglich automatisch (Windows, PC muss laufen) per Aufgabenplanung:
 *   schtasks /Create /SC DAILY /TN "eCreator Backup" /TR ^
 *     "cmd /c cd /d C:\Users\Win11\ecreator-hq && C:\Users\Win11\ecreator-os\.tools\node\node.exe scripts\backup.mjs" /ST 23:00
 *
 * Hinweis: Echte managed Off-Site-Backups = Supabase Pro-Plan (taeglich, automatisch).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

for (const raw of readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n")) {
  const l = raw.trim(); if (!l || l.startsWith("#")) continue;
  const i = l.indexOf("="); if (i === -1) continue;
  const k = l.slice(0, i).trim(); let v = l.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (!(k in process.env)) process.env[k] = v;
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) { console.error("[backup] NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY noetig."); process.exit(1); }

// Alle Geschaeftsdaten-Tabellen (config/seed bewusst inklusive).
const TABLES = [
  "organizations", "profiles", "roles", "user_roles", "permissions", "role_permissions",
  "statuses", "priorities", "activity_logs", "audits",
  "clients", "contacts", "projects", "files", "meetings", "contracts", "offers",
  "tasks", "subtasks", "task_comments", "task_files", "task_assignees", "task_activity",
  "task_templates", "task_template_items", "notifications",
  "leads", "sales_activities",
  "reporting_calls", "client_interactions", "client_checklists", "client_checklist_items",
  "website_projects", "ad_projects", "crm_projects", "content_projects",
  "shoots", "assets", "approvals", "project_milestones",
  "creators", "creator_assets", "creator_availability", "creator_ratings", "shoot_assignments",
  "invoices", "expenses",
  "ai_prompts", "ai_runs", "automation_jobs", "automation_runs", "integrations", "webhooks",
  "lead_sources", "lead_discovery_runs", "lead_companies", "lead_opportunities",
  "outreach_campaigns", "email_templates", "outreach_contacts", "outreach_messages",
  "follow_up_sequences", "booked_meetings", "unsubscribes",
  "website_audits", "audit_findings", "audit_opportunities",
  "pricing_items", "proposals", "proposal_items",
  "knowledge_articles", "sops", "prompt_library",
  "executive_alerts", "company_goals",
  "upsell_opportunities", "referral_opportunities", "review_requests", "renewals", "churn_risks", "testimonials",
  "revenue_journeys", "growth_recommendations", "automation_orchestrations", "growth_alerts",
];

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

async function main() {
  const out = { generatedAt: new Date().toISOString(), project: url, tables: {} };
  let totalRows = 0, ok = 0, missing = 0;
  for (const t of TABLES) {
    const { data, error } = await supabase.from(t).select("*");
    if (error) { missing++; continue; } // Tabelle existiert nicht -> ueberspringen
    out.tables[t] = data ?? [];
    totalRows += (data ?? []).length;
    ok++;
    if ((data ?? []).length > 0) console.log(`  ${t.padEnd(28)} ${String(data.length).padStart(5)} Zeilen`);
  }
  mkdirSync(resolve(process.cwd(), "backups"), { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const path = resolve(process.cwd(), "backups", `ecreator-backup-${stamp}.json`);
  writeFileSync(path, JSON.stringify(out, null, 2), "utf8");
  console.log(`\n[backup] ${ok} Tabellen, ${totalRows} Zeilen gesichert (${missing} nicht vorhanden).`);
  console.log(`[backup] Datei: ${path}\n`);
}
main().catch((e) => { console.error("[backup] FEHLER:", e.message ?? String(e)); process.exit(1); });
