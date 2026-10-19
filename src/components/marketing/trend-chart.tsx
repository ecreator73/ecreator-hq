"use client";

import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Hauptchart ohne Chart-Bibliothek (SVG). Metrik waehlbar, Linie/Balken,
 * Tag/Woche/Monat, Vergleichsperiode als gestrichelte Linie, Paarvergleiche
 * (gleiche Einheit: zwei Reihen; verschiedene Einheiten: zwei Diagramme
 * untereinander - nie zwei Y-Achsen). Tooltip beim Ueberfahren, Tabellenansicht.
 */

export interface ChartPoint {
  day: string;
  users: number | null;
  sessions: number | null;
  leads: number;
  bookings: number;
  spend: number | null;
  spendGoogle: number | null;
  spendMeta: number | null;
  organicSessions: number | null;
  paidSessions: number | null;
}

type Fmt = "int" | "chf" | "pct";
type MetricKey = "users" | "sessions" | "leads" | "bookings" | "spend" | "cr" | "cpl";

const METRICS: Array<{ key: MetricKey; label: string; fmt: Fmt; additive: boolean }> = [
  { key: "users", label: "Besucher", fmt: "int", additive: false },
  { key: "sessions", label: "Sitzungen", fmt: "int", additive: true },
  { key: "leads", label: "Website-Leads", fmt: "int", additive: true },
  { key: "bookings", label: "Buchungen", fmt: "int", additive: true },
  { key: "spend", label: "Spend", fmt: "chf", additive: true },
  { key: "cr", label: "Conversion-Rate", fmt: "pct", additive: false },
  { key: "cpl", label: "Kosten pro Lead", fmt: "chf", additive: false },
];

const PAIRS = [
  { key: "none", label: "Einzelmetrik" },
  { key: "spend_leads", label: "Spend vs. Leads" },
  { key: "visitors_conv", label: "Besucher vs. Conversions" },
  { key: "google_meta", label: "Google vs. Meta (Spend)" },
  { key: "organic_paid", label: "Organic vs. Paid (Sitzungen)" },
] as const;
type PairKey = (typeof PAIRS)[number]["key"];

const SERIES_A = "#4f46e5"; // validiert (validate_palette.js, hell)
const SERIES_B = "#eb6834";
const COMPARE = "#a3a3a3";

type Gran = "day" | "week" | "month";

interface Bucket {
  key: string;
  label: string;
  users: number | null;
  sessions: number | null;
  leads: number;
  bookings: number;
  spend: number | null;
  spendGoogle: number | null;
  spendMeta: number | null;
  organicSessions: number | null;
  paidSessions: number | null;
}

const add = (a: number | null, b: number | null) => (a == null && b == null ? null : (a ?? 0) + (b ?? 0));

function weekKey(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - dow * 86_400_000).toISOString().slice(0, 10);
}

function bucketize(points: ChartPoint[], gran: Gran): Bucket[] {
  const map = new Map<string, Bucket>();
  for (const p of points) {
    const key = gran === "day" ? p.day : gran === "week" ? weekKey(p.day) : p.day.slice(0, 7);
    const label = gran === "month" ? `${key.slice(5, 7)}.${key.slice(0, 4)}` : `${key.slice(8, 10)}.${key.slice(5, 7)}.`;
    const b = map.get(key);
    if (!b) {
      map.set(key, { key, label: gran === "week" ? `KW ab ${label}` : label, ...p });
    } else {
      b.users = gran === "day" ? b.users : add(b.users, p.users);
      b.sessions = add(b.sessions, p.sessions);
      b.leads += p.leads;
      b.bookings += p.bookings;
      b.spend = add(b.spend, p.spend);
      b.spendGoogle = add(b.spendGoogle, p.spendGoogle);
      b.spendMeta = add(b.spendMeta, p.spendMeta);
      b.organicSessions = add(b.organicSessions, p.organicSessions);
      b.paidSessions = add(b.paidSessions, p.paidSessions);
    }
  }
  return [...map.values()];
}

function value(b: Bucket, key: MetricKey | "spendGoogle" | "spendMeta" | "organicSessions" | "paidSessions"): number | null {
  switch (key) {
    case "cr":
      return b.sessions ? b.leads / b.sessions : null;
    case "cpl":
      return b.spend != null && b.leads > 0 ? b.spend / b.leads : null;
    default:
      return b[key];
  }
}

function fmt(v: number | null, f: Fmt): string {
  if (v == null || !Number.isFinite(v)) return "–";
  if (f === "chf") return new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF", maximumFractionDigits: v / 1e6 < 100 ? 2 : 0 }).format(v / 1_000_000);
  if (f === "pct") return `${new Intl.NumberFormat("de-CH", { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(v * 100)} %`;
  return new Intl.NumberFormat("de-CH", { maximumFractionDigits: 0 }).format(v);
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

interface Series {
  label: string;
  color: string;
  values: Array<number | null>;
  dashed?: boolean;
}

function Plot({ labels, series, f, kind, height = 200 }: { labels: string[]; series: Series[]; f: Fmt; kind: "line" | "bar"; height?: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 800;
  const H = height;
  const pad = { l: 56, r: 12, t: 10, b: 24 };
  const n = labels.length;
  const all = series.flatMap((s) => s.values.filter((v): v is number => v != null));
  const max = niceMax(Math.max(0, ...all));
  const x = (i: number) => pad.l + (n <= 1 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (n - 1));
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const barSeries = series.filter((s) => !s.dashed);
  const slot = (W - pad.l - pad.r) / Math.max(n, 1);
  const barW = Math.max(2, Math.min(28, (slot - 2) / Math.max(barSeries.length, 1) - 2));
  const xb = (i: number, si: number) => pad.l + i * slot + (slot - barSeries.length * (barW + 2)) / 2 + si * (barW + 2);

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r || n === 0) return;
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = kind === "bar" ? Math.floor((px - pad.l) / slot) : Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, i)));
  };

  const labelIdx = n <= 1 ? [0] : [0, Math.floor((n - 1) / 2), n - 1];

  return (
    <div className="relative">
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none select-none"
        role="img"
        aria-label={series.map((s) => s.label).join(", ")}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#e5e5e5" strokeWidth={1} />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="#737373">
              {fmt(t, f)}
            </text>
          </g>
        ))}
        {labelIdx.map((i) => (
          <text key={i} x={kind === "bar" ? pad.l + i * slot + slot / 2 : x(i)} y={H - 6} textAnchor={i === 0 && kind === "line" ? "start" : i === n - 1 && kind === "line" ? "end" : "middle"} fontSize={11} fill="#737373">
            {labels[i]}
          </text>
        ))}
        {kind === "bar"
          ? barSeries.map((s, si) =>
              s.values.map((v, i) =>
                v == null || v <= 0 ? null : (
                  <rect key={`${si}-${i}`} x={xb(i, si)} y={y(v)} width={barW} height={Math.max(1, y(0) - y(v))} rx={2} fill={s.color} opacity={hover == null || hover === i ? 1 : 0.55} />
                ),
              ),
            )
          : null}
        {series
          .filter((s) => kind === "line" || s.dashed)
          .map((s, si) => {
            let d = "";
            s.values.forEach((v, i) => {
              if (v == null) return;
              const px = kind === "bar" ? pad.l + i * slot + slot / 2 : x(i);
              d += `${d && s.values[i - 1] != null ? "L" : "M"}${px.toFixed(1)},${y(v).toFixed(1)}`;
            });
            return <path key={si} d={d} fill="none" stroke={s.color} strokeWidth={2} strokeDasharray={s.dashed ? "4 4" : undefined} strokeLinejoin="round" strokeLinecap="round" />;
          })}
        {hover != null ? (
          <g>
            <line x1={kind === "bar" ? pad.l + hover * slot + slot / 2 : x(hover)} x2={kind === "bar" ? pad.l + hover * slot + slot / 2 : x(hover)} y1={pad.t} y2={H - pad.b} stroke="#a3a3a3" strokeWidth={1} />
            {kind === "line"
              ? series.map((s, si) => {
                  const v = s.values[hover];
                  return v == null ? null : <circle key={si} cx={x(hover)} cy={y(v)} r={4} fill={s.color} stroke="#fff" strokeWidth={2} />;
                })
              : null}
          </g>
        ) : null}
      </svg>
      {hover != null ? (
        <div
          className="pointer-events-none absolute top-1 z-10 min-w-[140px] rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-[11px] shadow-sm"
          style={{ left: `${Math.min(78, Math.max(8, ((kind === "bar" ? pad.l + hover * slot + slot / 2 : x(hover)) / W) * 100))}%`, transform: "translateX(-50%)" }}
        >
          <p className="font-medium text-neutral-800">{labels[hover]}</p>
          {series.map((s) => (
            <p key={s.label} className="flex items-center justify-between gap-3 text-neutral-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-3" style={{ background: s.color }} aria-hidden />
                {s.label}
              </span>
              <span className="tabular-nums text-neutral-900">{fmt(s.values[hover] ?? null, f)}</span>
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Legend({ series }: { series: Series[] }) {
  if (series.length < 2) return null;
  return (
    <div className="flex flex-wrap gap-3 text-[11px] text-neutral-600">
      {series.map((s) => (
        <span key={s.label} className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4" style={{ background: s.color, borderTop: s.dashed ? `2px dashed ${s.color}` : undefined, height: s.dashed ? 0 : undefined }} aria-hidden />
          {s.label}
        </span>
      ))}
    </div>
  );
}

const Seg = <T extends string>({ value, options, onChange, label }: { value: T; options: ReadonlyArray<{ key: T; label: string }>; onChange: (v: T) => void; label: string }) => (
  <div role="group" aria-label={label} className="flex rounded-md border border-neutral-200 bg-white p-0.5">
    {options.map((o) => (
      <button key={o.key} type="button" aria-pressed={value === o.key} onClick={() => onChange(o.key)} className={cn("rounded px-2 py-0.5 text-[11px] font-medium", value === o.key ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100")}>
        {o.label}
      </button>
    ))}
  </div>
);

export function TrendChart({
  points,
  comparePoints,
  compareLabel,
  missing,
}: {
  points: ChartPoint[];
  comparePoints: ChartPoint[] | null;
  compareLabel: string | null;
  /** Grund je Metrik, wenn die Quelle fehlt (z.B. «GA4: Integration erforderlich») */
  missing: Partial<Record<MetricKey | "google_meta" | "organic_paid", string>>;
}) {
  const [metric, setMetric] = useState<MetricKey>("leads");
  const [kind, setKind] = useState<"line" | "bar">("line");
  const [gran, setGran] = useState<Gran>("day");
  const [pair, setPair] = useState<PairKey>("none");
  const [table, setTable] = useState(false);

  const cur = useMemo(() => bucketize(points, gran), [points, gran]);
  const prev = useMemo(() => (comparePoints ? bucketize(comparePoints, gran) : null), [comparePoints, gran]);
  const labels = cur.map((b) => b.label);
  const m = METRICS.find((x) => x.key === metric)!;

  const views: Array<{ title?: string; f: Fmt; series: Series[]; missing?: string }> = (() => {
    if (pair === "spend_leads")
      return [
        { title: "Spend", f: "chf" as Fmt, series: [{ label: "Spend", color: SERIES_A, values: cur.map((b) => b.spend) }], missing: missing.spend },
        { title: "Website-Leads", f: "int" as Fmt, series: [{ label: "Website-Leads", color: SERIES_A, values: cur.map((b) => b.leads) }] },
      ];
    if (pair === "visitors_conv")
      return [
        { title: gran === "day" ? "Besucher" : "Sitzungen", f: "int" as Fmt, series: [{ label: gran === "day" ? "Besucher" : "Sitzungen", color: SERIES_A, values: cur.map((b) => (gran === "day" ? b.users : b.sessions)) }], missing: missing.users },
        { title: "Conversions (Leads + Buchungen)", f: "int" as Fmt, series: [{ label: "Conversions", color: SERIES_A, values: cur.map((b) => b.leads) }] },
      ];
    if (pair === "google_meta")
      return [
        {
          f: "chf" as Fmt,
          series: [
            { label: "Google Ads", color: SERIES_A, values: cur.map((b) => b.spendGoogle) },
            { label: "Meta Ads", color: SERIES_B, values: cur.map((b) => b.spendMeta) },
          ],
          missing: missing.google_meta,
        },
      ];
    if (pair === "organic_paid")
      return [
        {
          f: "int" as Fmt,
          series: [
            { label: "Organic Search", color: SERIES_A, values: cur.map((b) => b.organicSessions) },
            { label: "Paid", color: SERIES_B, values: cur.map((b) => b.paidSessions) },
          ],
          missing: missing.organic_paid,
        },
      ];
    const notAdditive = !m.additive && metric === "users" && gran !== "day";
    const s: Series[] = [{ label: m.label, color: SERIES_A, values: cur.map((b) => value(b, metric)) }];
    if (prev && compareLabel) s.push({ label: compareLabel, color: COMPARE, dashed: true, values: cur.map((_, i) => (prev[i] ? value(prev[i]!, metric) : null)) });
    return [{ f: m.fmt, series: s, missing: notAdditive ? "Besucher sind nicht über Tage summierbar - bitte Tagesansicht wählen oder «Sitzungen» verwenden." : missing[metric] }];
  })();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="mi-metric">Metrik</label>
        <select id="mi-metric" value={pair === "none" ? metric : ""} disabled={pair !== "none"} onChange={(e) => setMetric(e.target.value as MetricKey)} className="h-7 rounded-md border border-neutral-200 bg-white px-1.5 text-xs disabled:opacity-50">
          {pair !== "none" ? <option value="">–</option> : null}
          {METRICS.map((x) => (
            <option key={x.key} value={x.key}>
              {x.label}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="mi-pair">Vergleich</label>
        <select id="mi-pair" value={pair} onChange={(e) => setPair(e.target.value as PairKey)} className="h-7 rounded-md border border-neutral-200 bg-white px-1.5 text-xs">
          {PAIRS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
        <Seg label="Darstellung" value={kind} onChange={setKind} options={[{ key: "line", label: "Linie" }, { key: "bar", label: "Balken" }] as const} />
        <Seg label="Intervall" value={gran} onChange={setGran} options={[{ key: "day", label: "Tag" }, { key: "week", label: "Woche" }, { key: "month", label: "Monat" }] as const} />
        <button type="button" onClick={() => setTable((t) => !t)} className="ml-auto text-[11px] font-medium text-neutral-600 underline-offset-2 hover:underline">
          {table ? "Diagramm" : "Tabelle"}
        </button>
      </div>
      {views.map((v, vi) => (
        <div key={vi} className="space-y-1.5">
          {v.title ? <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">{v.title}</p> : null}
          {v.missing ? (
            <p className="rounded-md border border-dashed border-neutral-200 px-3 py-8 text-center text-xs text-neutral-500">{v.missing}</p>
          ) : table ? (
            <div className="max-h-72 overflow-auto rounded-md border border-neutral-100">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-neutral-50 text-neutral-500">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-medium">Periode</th>
                    {v.series.map((s) => (
                      <th key={s.label} className="px-2 py-1.5 text-right font-medium">
                        {s.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {labels.map((l, i) => (
                    <tr key={l} className="border-t border-neutral-100">
                      <td className="px-2 py-1 text-neutral-700">{l}</td>
                      {v.series.map((s) => (
                        <td key={s.label} className="px-2 py-1 text-right tabular-nums text-neutral-900">
                          {fmt(s.values[i] ?? null, v.f)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <>
              <Legend series={v.series} />
              <Plot labels={labels} series={v.series} f={v.f} kind={kind} height={views.length > 1 ? 150 : 210} />
            </>
          )}
        </div>
      ))}
    </div>
  );
}
