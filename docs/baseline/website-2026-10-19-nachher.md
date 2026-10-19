# Leistungsmessung nach der Website-Änderung (19.10.2026)

Änderung: serverseitige Weiterleitung der Leads an eCreator OS (`src/lib/leads/ecreator-os.ts`, `src/lib/leads/deliver.ts`) und Dublettensperre. Kein Browser-Code.
Gleiche Messung wie die Baseline (`lighthouse_baseline.py`, Lighthouse 13.4, lokaler Produktions-Build auf :3101, Google-Abrufe blockiert, je 1 Lauf).

| Gerät | Seite | Perf | A11y | BP | SEO | FCP s | LCP s | CLS | TBT ms | TTFB ms | JS KB | gesamt KB | Anfragen |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| mobile | Startseite | 90 | 100 | 100 | 100 | 1.21 | 3.56 | 0.000 | 20 | 8 | 184 | 434 | 36 |
| mobile | Leistungsseite | 96 | 100 | 100 | 100 | 1.21 | 2.78 | 0.000 | 12 | 6 | 199 | 429 | 40 |
| mobile | Kontakt | 94 | 100 | 100 | 100 | 1.06 | 3.08 | 0.000 | 12 | 3 | 196 | 416 | 38 |
| mobile | Landingpage | 94 | 100 | 100 | 100 | 1.21 | 3.04 | 0.000 | 26 | 6 | 209 | 462 | 42 |
| desktop | Startseite | 100 | 100 | 100 | 100 | 0.32 | 0.71 | 0.000 | 0 | 4 | 218 | 544 | 65 |
| desktop | Leistungsseite | 100 | 100 | 100 | 100 | 0.28 | 0.59 | 0.000 | 0 | 4 | 225 | 498 | 53 |
| desktop | Kontakt | 100 | 100 | 100 | 100 | 0.29 | 0.63 | 0.000 | 0 | 2 | 218 | 466 | 54 |
| desktop | Landingpage | 100 | 100 | 100 | 100 | 0.32 | 0.65 | 0.000 | 0 | 3 | 234 | 530 | 55 |

**Mobile Startseite einzeln 90 / LCP 3.56 s** (Baseline 92 / 3.32 s) bei identischen Bytes und Anfragen. Nachgeprüft:

- 5 Wiederholungen mobil Startseite: Perf 92, 92, 92, 92, 92 · LCP 3.31, 3.31, 3.32, 3.32, 3.31 s (Median 92 / 3.31 s = Baseline). Der Einzelwert war ein Ausreisser.
- Build-Vergleich live (2a4e072) gegen neu: alle 57 Dateien unter `.next/static` (JS, CSS, Schriften) byte-identisch; vorgerenderte HTML-Seiten (Start, Kontakt) gleich lang, einziger Unterschied die Build-ID.

Ergebnis: **keine Regression**, Website-Bundle unverändert (JS 184–234 KB, gleiche Anfragen). INP weiterhin nur aus Felddaten (CrUX: keine Daten).
