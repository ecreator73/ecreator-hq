# Umstellung Lovable-CRM → eCreator OS

Stand: 20.10.2026. Alle Bereiche sind übernommen (Dashboard, Leads, Kunden, Production, Finance, öffentliche Links). Delta-Import vom 20.10.2026 15:27 UTC: 8 neue Creator-Bewerbungen inkl. Medien, sonst keine neuen oder geänderten Daten. Bestehende Links aus dem alten CRM (15 Verträge, 2 Shootings) funktionieren in eCreator OS weiter.

Legende: **[E]** = Entscheid durch dich, **[D]** = machst du (Konto, Zugang, Zahlung), **[C]** = kann ich übernehmen.

## 1. Entscheide vor dem Stichtag

- [ ] **[E] Weg der Umstellung.** Empfehlung: `crm.ecreator.ch` auf eCreator OS zeigen lassen. Dann funktionieren alle bestehenden Links ohne Änderung: Instagram-Kampagne «Model Bewerbungen» (`/model` mit UTM), `/onboarding`, `/signieren/…`, `/shoot-review/…`. Alternative: nur die Ziel-URL der Kampagne ändern; dann laufen alte Links ins Leere, sobald Lovable abgeschaltet ist.
- [ ] **[E] Supabase-Plan.** Heute Free Plan: max. 50 MB pro Datei (Videos werden verkleinert oder als Link angegeben), keine täglichen Backups, Pausieren bei Inaktivität (durch den täglichen Wach-Job abgefedert). Empfehlung für das einzige System: Pro Plan (Backups, Uploads bis 100 MB wie bisher).
- [ ] **[E] E-Mail-Versand.** eCreator OS verschickt bewusst keine E-Mails. Im alten CRM gab es Absage-/Warteliste-Mails an Creator, das Wochenbriefing und Erinnerungen. Entscheiden: weiter manuell oder Versand anbinden (Absender, Vorlagen, Freigabe).

## 2. Vorbereitung (vor dem Stichtag)

- [ ] **[D] Konten anlegen** für Ricardo, Noelia, Saidur (Rollen Sales bzw. Creative). Ohne Konto fehlen Zuständigkeiten: aktuell haben nur 7 von 320 Leads eine zuständige Person, Shootings und Redaktionspläne sind ohne Verantwortliche.
- [ ] **[D] MFA** für alle Leitungskonten aktivieren.
- [ ] **[D] Lovable-Passwort ändern** (wurde im Chat geteilt).
- [ ] **[D] QR-Rechnung prüfen:** eine Rechnung in eCreator OS öffnen und den QR-Code mit der Banking-App scannen (nur Vorschau, keine Zahlung).
- [ ] **[D] Kontoauszug:** im Valiant-E-Banking prüfen, ob camt.054 oder camt.053 als XML exportierbar ist (für «Offene Posten» → Zahlungseingänge abgleichen).
- [ ] **[C] Woher kommen die Leads?** Im alten CRM: Meta Ads (309), Website, TikTok Ads, Lohnrechner, Vermittlung, manuell. Website-Anfragen kommen bereits in eCreator OS an. Für Meta/TikTok/Lohnrechner herausfinden, über welchen Weg sie heute ins alte CRM laufen (Webhook, Zapier), und auf eCreator OS umhängen (`/api/webhooks/meta`, `/api/webhooks/zapier`).
- [ ] **[C] Kunden-Leads-Sync klären:** Die Leads aus den Kunden-CRMs (Grundlage für Monatsberichte) wurden im alten CRM zuletzt am **16.10.2026** synchronisiert, seither nichts Neues. Ursache klären und für eCreator OS einen Abgleich bauen (fehlt noch).
- [ ] **[C] Hintergrundjobs ersetzen** (laufen heute im alten CRM):

  | Job im alten CRM | eCreator OS heute | Vorschlag |
  |---|---|---|
  | Meta-Conversions zurückmelden (`ad-conversions-dispatch`) | fehlt; im alten CRM 0 Ereignisse gesendet | nach Bedarf, tiefe Priorität |
  | Wochenbriefing (`weekly-briefing`) | Seite «Briefing», kein Versand | mit E-Mail-Entscheid |
  | Shooting-Erinnerungen (`shoot-reminders`) | Übersicht mit Kennzahlen, keine Erinnerung | In-App-Benachrichtigung am Vortag |
  | Content-Automation (`content-automation`) | Redaktionskalender; Wiederholungsregel ist inaktiv | später |
  | Vertrags-Wächter (`contract-watchdog`) | «Kündbar in 60 Tagen» sichtbar, keine Erinnerung | In-App-Benachrichtigung vor Kündigungsfrist |

- [ ] **[D] Team-Einführung** (30 Min.): Leads-Arbeitsliste und Anruf-Erfassung, Kunden-Leads und Monatsbericht, Shootings mit Kundenlink, Bewerbungen, Monatsrechnungen freigeben, Links teilen.

## 3. Stichtag (Reihenfolge)

1. [ ] **[D]** Team informieren: ab Uhrzeit X wird nur noch in eCreator OS gearbeitet.
2. [ ] **[C]** Letzter Export aus dem alten CRM (nur lesend, über deine Sitzung) und Delta-Import, ändert nichts Bestehendes:
   ```bash
   node scripts/import-lovable.mjs <export.json> --only-new
   node scripts/import-lovable-clients.mjs <export.json> --only-new
   node scripts/import-lovable-production.mjs <export.json> --only-new
   node scripts/import-lovable-finance.mjs <export.json> --only-new
   node scripts/import-lovable-tokens.mjs <export.json>
   ```
3. [ ] **[C]** Medien der neuen Bewerbungen kopieren (`scripts/copy-lovable-media.mjs`: prepare → Browser → finalize, bei Videos über 50 MB large-prepare/large-run, danach normalize).
4. [ ] **[D]** Umstellung gemäss Entscheid 1: Domain `crm.ecreator.ch` im Vercel-Projekt `ecreator-hq` hinzufügen und den DNS-Eintrag beim Domain-Anbieter umstellen (oder Kampagnen-URL ändern). In Supabase (eCreator OS) unter Authentication → URL Configuration die neue Adresse als Site-/Redirect-URL eintragen.
5. [ ] **[C]** Live-Prüfung: Login, `/model` mit UTM, `/onboarding`, ein alter Vertrags-Link, eine Test-Bewerbung (danach löschen).
6. [ ] **[D/C]** Website: Weiterleitung der Anfragen an das alte CRM abschalten (Umgebungsvariablen `LEAD_WEBHOOK_URL` und, falls gesetzt, `INQUIRY_WEBHOOK_URL` im Vercel-Projekt `ecreator-website` entfernen, neu deployen; die Website liest `INQUIRY_WEBHOOK_URL` als Ersatz). Die Weiterleitung an eCreator OS bleibt.
7. [ ] **[D]** Lead-Quellen (Meta, TikTok, Lohnrechner) auf eCreator OS umgehängt, erste echte Anfrage kontrolliert.

## 4. Nach der Umstellung

- [ ] **[D]** Altes CRM 30 Tage nur noch lesend behalten (Kontrolle), dann kündigen. Alle Rohdaten liegen zusätzlich im Archiv `legacy_lovable_records` in eCreator OS.
- [ ] **[C]** Lokale Export-Dateien mit Personendaten löschen (Arbeitsordner der Übernahme).
- [ ] **[C]** Nach 1–2 Wochen: offene Punkte aus dem Betrieb einsammeln (fehlende Felder, Abläufe), Kunden-Leads-Sync und Erinnerungen umsetzen.
