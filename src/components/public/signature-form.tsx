"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Eraser, Loader2 } from "lucide-react";
import { signDocumentAction } from "@/app/(public)/signieren/actions";

/** Unterschriftsfeld (Finger, Stift oder Maus) mit verbindlicher Bestaetigung. */
export function SignatureForm({ kind, token }: { kind: "offer" | "contract"; token: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [drawn, setDrawn] = useState(false);
  const [name, setName] = useState("");
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const isOffer = kind === "offer";

  /** Zeichenflaeche an die angezeigte Groesse anpassen (loescht den Inhalt). */
  const fit = () => {
    const c = canvas.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    if (!r.width || (c.width === Math.round(r.width * 2) && c.height === Math.round(r.height * 2))) return;
    c.width = Math.round(r.width * 2);
    c.height = Math.round(r.height * 2);
    const ctx = c.getContext("2d")!;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
    setDrawn(false);
  };
  useEffect(() => {
    fit();
    const ro = new ResizeObserver(() => fit());
    if (canvas.current) ro.observe(canvas.current);
    return () => ro.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pos = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };
  const clear = () => {
    const c = canvas.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setDrawn(false);
  };

  async function sign() {
    setBusy(true);
    setError(null);
    const r = await signDocumentAction({ kind, token, name: name.trim(), signature: canvas.current!.toDataURL("image/png"), accept });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setDone(true);
  }

  if (done)
    return (
      <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" role="status">
        <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
        Unterschrieben von {name.trim()}. Vielen Dank, wir melden uns bei Ihnen.
      </p>
    );

  return (
    <section className="space-y-4 rounded-2xl border border-neutral-200 p-5 sm:p-6" aria-labelledby="sign-title">
      <h2 id="sign-title" className="text-lg font-semibold">
        Digital unterschreiben
      </h2>
      <label className="block text-sm font-medium">
        Vor- und Nachname *
        <input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block h-11 w-full rounded-lg border border-neutral-300 px-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
      </label>
      <div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Unterschrift *</span>
          <button type="button" onClick={clear} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100">
            <Eraser className="h-3.5 w-3.5" aria-hidden /> Löschen
          </button>
        </div>
        <canvas
          ref={canvas}
          aria-label="Unterschriftsfeld"
          className="mt-1 h-40 w-full touch-none rounded-lg border border-neutral-300 bg-white"
          onPointerDown={(e) => {
            fit();
            drawing.current = true;
            canvas.current!.setPointerCapture(e.pointerId);
            const ctx = canvas.current!.getContext("2d")!;
            const [x, y] = pos(e);
            ctx.beginPath();
            ctx.moveTo(x, y);
          }}
          onPointerMove={(e) => {
            if (!drawing.current) return;
            const ctx = canvas.current!.getContext("2d")!;
            const [x, y] = pos(e);
            ctx.lineTo(x, y);
            ctx.stroke();
            setDrawn(true);
          }}
          onPointerUp={() => (drawing.current = false)}
          onPointerLeave={() => (drawing.current = false)}
        />
        <p className="mt-1 text-xs text-neutral-500">Mit Finger, Stift oder Maus im Feld unterschreiben.</p>
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-0.5 h-4 w-4" />
        <span>
          Ich habe {isOffer ? "die Offerte" : "den Vertrag"} gelesen und {isOffer ? "nehme sie" : "akzeptiere ihn"} verbindlich an.
        </span>
      </label>
      {error ? <p className="text-sm text-rose-700" role="alert">{error}</p> : null}
      <button
        type="button"
        onClick={sign}
        disabled={busy || !accept || !drawn || name.trim().length < 2}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null}
        Verbindlich unterschreiben
      </button>
      <p className="text-xs text-neutral-500">Zum Nachweis speichern wir Name, Unterschrift, Zeitpunkt, IP-Adresse und Browser.</p>
    </section>
  );
}
