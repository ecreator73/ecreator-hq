"""Leistungs-Baseline vor dem Dashboard: Lighthouse alle Kategorien, mobil + desktop, 4 Seitentypen.
Google-Anfragen blockiert (keine Testsignale). Ergebnis: baseline/<label>/*.json + Tabelle (Markdown).
Usage: python baseline.py <label>"""
import json, os, subprocess, sys

NODE = r"C:\Users\Win11\ecreator-os\.tools\node\node.exe"
LH = r"C:\Users\Win11\AppData\Local\npm-cache\_npx\0f94ee7615faf582\node_modules\lighthouse\cli\index.js"
BASE = "http://localhost:3101"
PAGES = [("Startseite", "/"), ("Leistungsseite", "/leistungen/seo"), ("Kontakt", "/kontakt"), ("Landingpage", "/google-ads-agentur")]
label = sys.argv[1]
out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "baseline", label)
os.makedirs(out_dir, exist_ok=True)

rows = []
for ff in ("mobile", "desktop"):
    for name, path in PAGES:
        out = os.path.join(out_dir, f"{ff}_{path.strip('/').replace('/', '__') or 'home'}.json")
        args = [NODE, LH, BASE + path, "--output=json", f"--output-path={out}", "--quiet",
                "--chrome-flags=--headless=new --no-first-run", "--blocked-url-patterns=*googletagmanager.com*"]
        if ff == "desktop":
            args.append("--preset=desktop")
        subprocess.run(args, check=False, timeout=300, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        r = json.load(open(out, encoding="utf-8"))
        c, a = r["categories"], r["audits"]
        nr = a["network-requests"]["details"]["items"]
        js = sum(x.get("transferSize", 0) for x in nr if x.get("resourceType") == "Script")
        tot = sum(x.get("transferSize", 0) for x in nr)
        rows.append((ff, name, *(round(c[k]["score"] * 100) for k in ("performance", "accessibility", "best-practices", "seo")),
                     a["first-contentful-paint"]["numericValue"] / 1000, a["largest-contentful-paint"]["numericValue"] / 1000,
                     a["cumulative-layout-shift"]["numericValue"], a["total-blocking-time"]["numericValue"],
                     a["server-response-time"]["numericValue"] if "server-response-time" in a else 0,
                     js / 1024, tot / 1024, len(nr)))
        print(rows[-1], flush=True)

lines = ["| Gerät | Seite | Perf | A11y | BP | SEO | FCP s | LCP s | CLS | TBT ms | TTFB ms | JS KB | gesamt KB | Anfragen |",
         "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|"]
for r in rows:
    lines.append(f"| {r[0]} | {r[1]} | {r[2]} | {r[3]} | {r[4]} | {r[5]} | {r[6]:.2f} | {r[7]:.2f} | {r[8]:.3f} | {r[9]:.0f} | {r[10]:.0f} | {r[11]:.0f} | {r[12]:.0f} | {r[13]} |")
open(os.path.join(out_dir, "tabelle.md"), "w", encoding="utf-8").write("\n".join(lines) + "\n")
print("\n".join(lines))
