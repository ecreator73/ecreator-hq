# Meta (Facebook Lead Ads) — Integration

Neue Facebook Lead Ads erscheinen über einen Webhook **in Echtzeit** als Leads im CRM —
ohne Drittanbieter (Zapier/Make). Direkt über Meta Graph API + Facebook Webhooks.

## Architektur (provider-generisch — Google/TikTok/LinkedIn später nach demselben Muster)

```
Meta Lead Ad  →  Facebook Webhook  →  /api/webhooks/meta  (Signaturprüfung)
   →  Graph-API: Lead abrufen  →  Normalizer  →  Upsert in leads (Supabase)
   →  sales_activities  +  Follow-up Task  +  ad_lead_events (Log)  →  Dashboard
```

Tabellen: `ad_integrations` (Verbindung, Tokens **verschlüsselt**), `ad_lead_events` (Event-Log),
zusätzliche `leads`-Spalten (`external_lead_id, form_id, form_name, ad_id, ad_name, adset_id,
adset_name, campaign_id, campaign_name`).

## Was du EINMALIG tun musst

### 1. SQL ausführen (Supabase → SQL Editor)
- `supabase/migrations/0020_ad_integrations.sql` (Tabellen + leads-Spalten)
- Falls noch nicht geschehen: `drop trigger if exists validate_status on public.leads;`

### 2. Meta-App anlegen (developers.facebook.com)
1. **Create App** → Typ „Business".
2. Produkte hinzufügen: **Facebook Login** und **Webhooks**.
3. **App Review / Permissions** (für Produktivbetrieb nötig): `leads_retrieval`,
   `pages_show_list`, `pages_read_engagement`, `pages_manage_metadata`, `ads_read`,
   `business_management`. (Im Entwicklungsmodus zunächst mit Test-/Admin-Usern testbar.)
4. **Facebook Login → Settings → Valid OAuth Redirect URIs**:
   `https://ecreator-hq.vercel.app/api/integrations/meta/callback`

### 3. Server-Secrets in Vercel (Production) hinterlegen
- `META_APP_ID` — App-ID
- `META_APP_SECRET` — App-Secret (**nur server-seitig**, niemals im Frontend)
- `META_VERIFY_TOKEN` — frei wählbarer Zufallsstring (für die Webhook-Verifizierung)
- optional `META_GRAPH_VERSION` (Default `v21.0`), `NEXT_PUBLIC_APP_URL` (Default die Live-URL)

### 4. Webhook in Meta registrieren (Produkt „Webhooks" → Page)
- **Callback URL**: `https://ecreator-hq.vercel.app/api/webhooks/meta`
- **Verify Token**: derselbe Wert wie `META_VERIFY_TOKEN`
- Feld **`leadgen`** abonnieren.
  (Das Abonnieren der einzelnen Seiten übernimmt danach der Button „Webhook abonnieren".)

### 5. Im CRM verbinden (Settings → Integrationen → Meta)
1. **Mit Facebook verbinden** → Login + Berechtigungen bestätigen.
2. **Formulare laden** → die Lead-Formulare deiner Seiten auswählen → **Auswahl speichern**.
3. **Webhook abonnieren** → abonniert `leadgen` für deine Seiten.
4. **Leads synchronisieren** → importiert die bestehenden (historischen) Leads.

Ab dann landet jeder neue Lead innerhalb von Sekunden im CRM (Status **Neu**, Quelle **Meta Ads**),
mit Aktivität „Lead über Meta Ads eingegangen" und Follow-up-Task „Neuen Meta Lead kontaktieren".

## Sicherheit
- **Webhook-Signatur** (`X-Hub-Signature-256`) wird gegen das App-Secret geprüft; ungültige
  Requests werden mit 403 abgewiesen.
- **OAuth-Tokens** werden AES-256-GCM-verschlüsselt gespeichert (`CREDENTIALS_SECRET`).
- `appsecret_proof` bei allen Graph-Aufrufen. App-Secret/Tokens nie im Frontend.
- Verwaltung nur für `super_admin` / `ceo` / `cso` (RLS + requireRole).

## Wartung / Erweiterung
- Eingehende Events: Settings → Meta → „Webhook-Events (letzte 20)".
- Token läuft ~60 Tage → später automatische Erneuerung ergänzen (Vorbereitung vorhanden).
- Weitere Anbieter (Google/TikTok/LinkedIn): neue `provider`-Zeile in `ad_integrations`,
  eigener `client.ts` + `normalizer.ts`, eigener Webhook-Route — Rest (Upsert/Activity/Task/
  Dashboard) bleibt gleich.
