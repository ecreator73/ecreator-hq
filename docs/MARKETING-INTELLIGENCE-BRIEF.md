# Briefing: eCreator Marketing Intelligence Dashboard (vom Kunden, 19.10.2026)

Verdichtete, vollständige Fassung des Kunden-Briefings. Entscheidungen und Architektur: `MARKETING-INTELLIGENCE.md`.

## Rollen und Ziel
Senior Full-Stack/Architektur/Analytics/Data/Performance/Security/UX, GA4-, Google-Ads-, Meta-, CRO-, Attributions- und CRM-Spezialist.
Echtes Analytics- und Attributionssystem (keine Mock-Daten), sicher, wartbar, skalierbar. Beantwortet: Besucher, Herkunft, beste Kanäle, Kampagnen → Leads → Termine, beste Landingpages und Leistungen, Kosten pro Lead/Termin, Keywords und Creatives mit Anfragen, Seiten vor der Conversion, Formular- und Calendly-Volumen, Leads nach Paid/Organic/Direct/Social, Entwicklung über Zeit.

## Unverhandelbare Regeln
1. **Design-Freeze Website:** Layout, Typo, Farben, Animationen, Navigation, Hero, Komponenten, Bilder, Inhalte, Responsive unverändert. Sichtbare Änderung nur, wenn für Tracking zwingend, und nur mit Freigabe.
2. **Performance-Freeze:** kein Dashboard-Code, keine Chart-/Admin-Bibliotheken auf öffentlichen Routen, keine zusätzlichen blockierenden Scripts/Requests, keine synchronen Analytics-Aufrufe, Serververarbeitung und Hintergrund-Sync bevorzugen.
3. **SEO-Freeze:** Titel, Descriptions, Canonicals, Structured Data, Sitemap, Robots, Redirects, URLs unverändert. Dashboard serverseitig geschützt, noindex, nicht in Sitemap/Navigation (robots.txt allein ist keine Sicherheit).
4. **Bestehendes Tracking erhalten, nichts doppelt** (GA4-Events, Ads-Conversions, Meta Pixel/CAPI, Calendly, Formulare).
5. **Keine erfundenen Daten.** Texte: «Integration erforderlich», «Keine Daten verfügbar», «Daten werden synchronisiert». ROAS ohne Umsatzdaten = «nicht verfügbar», nicht 0.
6. **Produktion:** keine Daten löschen, Tracking nicht ersetzen, keine E-Mails versenden, keine DNS- oder Werbekonto-Änderungen ohne Freigabe. (Freigabe für Website-Änderung, Migrationen, Env-Variablen und Deployments erteilt am 19.10.2026.)

## Architektur
Getrennt: öffentliche Website (Speed, SEO, Conversion) und internes Dashboard (eCreator OS). Datenfluss: Marketing-APIs → serverseitige Integrationsschicht → geplanter Sync → normalisierte DB → Aggregation → Dashboard. Keine Credentials im Frontend. Robust gegen Rate Limits, abgelaufene Tokens, Fehler, Teildaten, Pagination, Retry/Backoff, Backfills, Dedup, Zeitzonen, Währungen, Attributionsunterschiede.

## Dashboard-Design
Premium-SaaS, eCreator-Branding, elegant, minimal, datenfokussiert, klare Typo, präzise Abstände, feine Linien, gute Charts/Tabellen, kompakte Filter, KPI-Karten. Kein generischer AI-/Admin-Template-Look, keine übertriebenen Verläufe, Schatten, Animationen.

## Navigation
- Übersicht: Dashboard, Live-Aktivität
- Analytics: Website Analytics, Traffic-Quellen, Visitor Journeys, Conversion Funnel, Landingpages
- Werbung: Google Ads, Meta Ads, Kampagnen-Performance
- Conversions: Leads, Kontaktformulare, Calendly-Buchungen, Attribution
- Suche: Search Console, Organische Performance
- Reporting: Berichte, Vergleiche
- System: Integrationen, Tracking-Gesundheit, Einstellungen

## Seiten und Inhalte
- **Übersicht** «Marketing Overview» / «Alle wichtigen Website-, Marketing- und Conversion-Daten auf einen Blick». Datumsfilter (Heute, Gestern, 7/30/90 Tage, dieser/letzter Monat, eigener Zeitraum), Vergleich (Vorperiode, Vorjahr). KPIs: Besucher, Sitzungen, Seitenaufrufe, neue/wiederkehrende Besucher, Formular-Leads, Calendly-Buchungen, Leads total, Conversion-Rate, Google-/Meta-/Total-Spend, Kosten pro Lead, Kosten pro Termin, organischer/bezahlter Traffic. Trend in %. Nutzer ≠ Sitzungen; Plattform-Conversions ≠ eindeutige CRM-Leads.
- **Hauptchart:** Metriken wählbar (Besucher, Sitzungen, Leads, Buchungen, Spend, CR, CPL), Linie/Balken, Tag/Woche/Monat, Vergleiche (Spend vs. Leads, Besucher vs. Conversions, Google vs. Meta, Organic vs. Paid).
- **Traffic-Quellen:** Google Organic, Google Ads, Facebook/Instagram Ads, Facebook/Instagram organisch, TikTok, LinkedIn, Direct, Referral, E-Mail, Sonstige; je Nutzer, Sitzungen, engagierte Sitzungen, Engagement-Rate, Conversions, Leads, Buchungen, CR, Spend, CPL, Kosten/Buchung. Einheitliche Kanalklassifizierung, UTM-basiert, Paid nie als Organic/Direct.
- **GA4 (Data API):** Nutzer, aktive/neue Nutzer, Sitzungen, engagiert, Engagement-Rate, Seitenaufrufe, Landingpages, Quelle/Medium, Kampagnen, Geräte, Länder, Städte, Events, Key Events, Vergleiche. Echte Property-ID, konfigurierbar. Keine individuellen Journeys aus Aggregaten behaupten.
- **Website Analytics:** Übersicht, Trends, Top-Seiten, Landingpages, Geräte, Geo, Quellen, Engagement, Conversions; Spalten Pfad, Titel, Aufrufe, Nutzer, Sitzungen, Engagement, Conversions, CR; Filter Datum, Quelle, Kampagne, Gerät, Landingpage, Leistungsseite.
- **Google Ads (offizielle API):** Konto, Kampagnen, Anzeigengruppen, Anzeigen, Keywords, Suchbegriffe (falls verfügbar), Impressionen, Klicks, CTR, Ø CPC, Kosten, Conversions, Wert, Kosten/Conv., CR, Status, Typ. KPIs inkl. Website-Leads, Buchungen, Kosten pro Website-Lead/Termin; Ads-Conversions klar getrennt von bestätigten Website-Leads. Kampagnentabelle (Kampagne, Status, Budget, Spend, Impr., Klicks, CTR, CPC, Conv., Kosten/Conv., Leads, Termine, CPL) mit Sortieren, Filtern, Suche, Vergleich, Detailansicht. Keyword-Report (Keyword, Match Type, Kampagne, Anzeigengruppe, Kennzahlen, Leads, Termine; Suchbegriffe/Landingpages falls verfügbar), Datenschutz-Schwellen respektieren.
- **Meta Ads (Marketing API):** Konten, Kampagnen, Anzeigengruppen, Anzeigen, Creatives, Impressionen, Reichweite, Frequenz, Klicks, Link-Klicks, CTR, CPC, CPM, Spend, gemeldete Leads/Conversions, Kosten/Ergebnis; Creative-Vorschau, Placements, Ziele falls verfügbar. KPIs inkl. Website-Leads und Buchungen; Kampagnentabelle mit Ziel, Reichweite, Ergebnissen, Leads, Buchungen, CPL; Detail mit Anzeigengruppen, Anzeigen, Creative-Vergleich. Plattform- vs. First-Party-Attribution trennen. Token serverseitig.
- **Zentrale Leads:** jede Anfrage (Formulare, Calendly, weitere) in einer Lead-DB. Felder: ID, Zeit, Vor-/Nachname, Firma, E-Mail, Telefon, Leistung, Nachricht, Formular-ID/-Name/-Seite, Landingpage, Conversion-Seite, Referrer, Quelle, Medium, Kampagne, Kampagnen-/Anzeigengruppen-/Anzeigen-ID, UTMs, gclid und weitere Klick-IDs (wenn erlaubt), Consent-Status, Attributions-Sicherheit, Status, Zuständig, Notizen. Datenminimierung.
- **First/Last Touch:** Quelle, Medium, Kampagne, erste Landingpage, Last-Touch-Felder, Conversion-Seite und -Zeit. Unbekannt = «Unknown / Unattributed».
- **Attributions-Persistenz:** leichtgewichtig, über Navigation hinweg, mit Absendung/Buchung verknüpfen, Consent respektieren, keine unnötigen Cookies, kein Cross-Site, keine Fingerprints, Aufbewahrung dokumentieren, Website nicht verlangsamen.
- **Formulare:** Verhalten erhalten, serverseitig validieren, Lead speichern, Attribution anhängen, Conversion-Ereignis, bestehende Benachrichtigungen, Dubletten verhindern (Idempotenz), Erfolgsanzeige wie bisher. Conversion erst nach bestätigtem Erfolg.
- **Calendly (API + Webhooks):** Buchungs-ID, Event-Typ, Buchungs- und Termindatum/-zeit, Name, E-Mail, Status, Absage, Verschiebung, UTMs, Quelle, Kampagne, Landingpage, verknüpfter Lead. Signaturprüfung, doppelte Zustellungen, Absagen und Verschiebungen korrekt, keine Dubletten. Attribution: Attributed / Partially Attributed / Unattributed. Dashboard mit KPIs (total, bestätigt, abgesagt, verschoben, nach Quelle, Kosten/Buchung) und Tabelle (Name, E-Mail, Typ, Daten, Quelle, Medium, Kampagne, Landingpage, Status, Lead) mit Suche, Filter, Export, Vergleich.
- **Funnel:** mehrere Definitionen, nur messbare Stufen, Volumen, CR, Abbruch, Vergleiche nach Kanal/Kampagne/Landingpage; Formular und Calendly als alternative Pfade; Grenzen erklären.
- **Customer Journey:** individuelle Wege nur aus eingewilligten First-Party-Ereignissen, keine Fingerprints, unbekannte Schritte nicht erfinden, «unvollständig» kennzeichnen; sonst aggregiert.
- **Landingpages:** URL, Titel, Sitzungen, Nutzer, Quellen, Google-/Meta-/Organic-Traffic, Formulare, Buchungen, CR, zurechenbarer Spend, CPL, Kosten/Buchung; Sortieren, Vergleichen; Hinweise (viel Traffic/wenig Conversion usw.) nur statistisch sinnvoll.
- **Search Console:** Klicks, Impressionen, CTR, Position, Top-Queries, Top-Seiten, Länder, Geräte, Vergleiche; Anonymisierung respektieren; GSC-Klicks ≠ GA4-Sitzungen.
- **Live-Aktivität:** neue Leads, Buchungen, Absagen, Statuswechsel, Integrations-/Tracking-Fehler mit Zeit, Typ, Quelle, Lead, Kampagne, Status. Nur echte First-Party-Ereignisse als «live»; Frische-Anzeige («zuletzt synchronisiert vor 15 Min.»).
- **Lead-Management:** Tabelle (Name, Firma, E-Mail, Telefon, Leistung, Quelle, Kampagne, Landingpage, Datum, Status, Zuständig, nächster Schritt), Status Neu, Kontaktiert, Qualifiziert, Termin gebucht, Offerte gesendet, Gewonnen, Verloren; Detail, Notizen, Status, Zuweisung, Filter, Suche, Export. Lead-Detail mit Kontakt, Firma, Leistung, Nachricht, Absendedaten, Quelle, Kampagne, Landingpage, First/Last Touch, Conversion-Seite, Calendly, bekannter Journey, Verlauf, Notizen, Status, Zuständigkeit, **Attributions-Sicherheit** (verifiziert per UTM, per Buchungsdaten, aus Aggregaten abgeleitet, unbekannt).
- **Dubletten:** wiederholte Absendung, doppelter Webhook, Verschiebung, gleiche Person zweimal, Formular + Buchung. Getrennte Konzepte Kontakt / Lead / Conversion-Ereignis / Buchung; echte Wiederholungsanfragen nicht löschen; deterministisches Matching; manuelles Zusammenführen.
- **Attributions-Berichte:** Leads und Buchungen nach Kanal, Kampagne, Landingpage; First/Last Touch; nicht zugeordnet; CR, CPL, Kosten/Buchung; Plattform-Attribution, First-Party und CRM-Ergebnis getrennt.
- **Kanalübergreifender Kampagnenvergleich:** Plattform, Kampagne, Spend, Impr., Klicks, CTR, CPC, Plattform-Conversions, Website-Leads, Buchungen, Kosten pro Lead/Buchung, CR; gleiche Zeiträume, Währungen normalisieren, Unterschiede beschriften.
- **Kosten:** täglich, wöchentlich, monatlich, nach Plattform, Kampagne, Landingpage (falls zurechenbar), CPL, Kosten/Buchung; keine Gewinn- oder ROAS-Erfindungen.
- **Reporting:** Executive, Website, Leadgenerierung, Google Ads, Meta Ads, SEO, Calendly, Landingpages, Attribution; Datumsfilter, Vergleiche, CSV, PDF nur wenn begründet (serverseitig, nie im Website-Bundle).
- **Tracking-Gesundheit:** Status GA4, Google Ads, Meta, Search Console, Calendly, Formulare, Webhooks, Attribution, Sync; je verbunden/getrennt, letzter Sync, letzter Fehler, Frische, nötige Rechte, Konfiguration; sicherer manueller Sync für Berechtigte.
- **Integrations-Einstellungen:** pro Plattform Property/Konto, Status, letzter Sync, Rechte; offizielles OAuth, keine Secrets in unsicheren Feldern, Anleitungen; ohne Zugang Framework bauen und «Einrichtung ausstehend» zeigen.
- **Hintergrund-Sync:** GA4, Ads, Meta, GSC, Calendly-Webhooks; Retry, Backoff, Pagination, Rate Limits, Fehlerlog, inkrementell, Backfills, idempotente Upserts, Frische; nie während öffentlicher Seitenaufrufe.
- **Datenmodell:** relationale Tabellen (Integrationen, Sync-Jobs, Tages-/Seiten-/Kampagnen-/Anzeigen-/Keyword-Metriken, Traffic-Quellen, Leads, Kontakte, Conversion-Ereignisse, Attribution, Sitzungen, Seitenereignisse, Buchungen, Aktivitäten, Health-Logs, Nutzer, Einstellungen) nur soweit nötig; Indizes, Fremdschlüssel, Unique auf externe IDs, Aufbewahrungsregeln.
- **Datenqualität:** Dubletten, fehlende Kampagnen-IDs/UTMs, ungültige Zeiten, Währung, Zeitzonen, doppelte Conversions, kaputte Verknüpfungen, abgelaufene Zugänge, unvollständiger Sync → sichtbare Warnungen.

## Schweiz, Datenschutz, Sicherheit
- Europe/Zurich, CHF, TT.MM.JJJJ, Deutsch, Schweizer Schreibweise (ss statt ß). Konto-Zeitzonen von Google/Meta beachten.
- DSG-konform, Consent respektieren, keine Fingerprints, keine verdeckte Identifikation, kein Cross-Site-Tracking, keine sensiblen Daten in URLs/Werbeparametern. Dokumentieren: was, wozu, wo, wie lange, wer, Löschung. Datenschutz-/Consent-Änderungen vorbereiten und vor Veröffentlichung freigeben lassen.
- Sicherheit: Authentifizierung, serverseitige Autorisierung, Rollen (ADMIN, MANAGEMENT, EMPLOYEE), geschützte APIs, Sessions, CSRF, Validierung, Output-Encoding, Rate Limiting, sichere Secrets, Audit-Log, DB-Policies, keine öffentlichen Lead-Daten, keine Secrets im Client/Log/Git. Keine öffentliche Registrierung, MFA bevorzugt.

## Performance, SEO, Fehler
- Website-Bundle nicht vergrössern, kein globales JS/CSS, keine Chart-Libs öffentlich, Fehler der Analytics dürfen Website und Formulare nie beeinträchtigen (Leads nie verlieren).
- Vorher/Nachher-Messung (Lighthouse Perf/SEO/A11y/BP, LCP, CLS, INP nur aus Felddaten, JS-Grösse, Requests, TTFB; Startseite, Leistungsseite, Kontakt, Landingpage; mobil/desktop). Ziel LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1, mobil 90+. Bei Regression nicht veröffentlichen. Baseline: `docs/baseline/website-2026-10-19.md`.
- Fehlerfälle (APIs down, Token abgelaufen, Rechte fehlen, Webhook-/DB-/Sync-Fehler, Teildaten, Script blockiert, kein Consent) mit klarem Status, sicherem Log, Retry.

## Tests
Website (Seiten, Navigation, Formulare, Calendly, Mobile, SEO, Tracking, Consent, Speed, «wie vorher»), Tracking (organisch, Ads-UTM, Meta-UTM, direkt, Referral, mehrere Seiten, Formular, Buchung, Absage, Verschiebung, Wiederkehrer, fehlende UTMs, abgelaufener Kontext, Consent verweigert/widerrufen, Adblocker), Integrationen (Verbindungen, Pagination, Fehler, Rate Limits, Tokens, Jobs, Webhook-Dubletten, Dedup, Datumsfilter, Währung, Zeitzonen; ohne Zugang isolierte Fixtures, klar als simuliert markiert), Dashboard (Login, Logout, Zugriff, KPIs, Charts, Filter, Tabellen, Details, Exporte, Einstellungen, Health, mobil/desktop). Keine Fake-Erfolgsmeldungen.

## Phasen
1 Audit · 2 Architektur · 3 Datenbank · 4 Admin-UI · 5 First-Party-Leads · 6 Attribution · 7 Calendly · 8 GA4 · 9 Google Ads · 10 Meta Ads · 11 Search Console · 12 Funnel & Reporting · 13 Sicherheit · 14 Performance · 15 QA · 16 Produktions-Review.

## Schlussbericht (Format)
ARCHITECTURE · IMPLEMENTED · CONNECTED INTEGRATIONS · PENDING INTEGRATIONS · TRACKING STATUS · ATTRIBUTION LIMITATIONS · PERFORMANCE (vorher/nachher) · SECURITY · TEST RESULTS · REQUIRED CONFIGURATION · APPROVAL REQUIRED · PRODUCTION STATUS (READY / NOT READY FOR REVIEW).

Prioritäten: 1. Website-Performance, 2. Datengenauigkeit, 3. Sicherheit, 4. verlässliche Attribution, 5. CRM-Integration, 6. UX, 7. Wartbarkeit, 8. Skalierbarkeit.
