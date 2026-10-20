// Creator-Fotos/-Videos aus dem alten CRM-Speicher (Lovable, Bucket «creator-applications»)
// in den privaten Speicher «creator-media» von eCreator OS uebernehmen.
//
//   node scripts/copy-lovable-media.mjs prepare <media-list.json>
//     -> legt einmalige Upload-Links an, speichert sie als Auftrag im privaten Speicher
//        und gibt EINEN kurzlebigen Link auf diesen Auftrag aus (fuer den Browser).
//   (Browser mit Lovable-Sitzung: liest jede Datei nur, laedt sie per Upload-Link hoch.)
//   node scripts/copy-lovable-media.mjs finalize <media-list.json>
//     -> prueft, was angekommen ist, setzt photo_file/video_file, loescht den Auftrag.
//   node scripts/copy-lovable-media.mjs large-prepare <media-list.json>
//     -> fuer Videos ueber der Upload-Grenze (Free Plan 50 MB): EIN Upload-Link, ueber den
//        der Browser die Lese-Links des alten Speichers ablegt.
//   node scripts/copy-lovable-media.mjs large-run <media-list.json> <arbeitsordner>
//     -> laedt diese Videos, verkleinert sie mit ffmpeg (H.264, max. 1080p) unter 48 MB,
//        laedt sie privat hoch, setzt video_file und loescht alle lokalen Kopien.
//   node scripts/copy-lovable-media.mjs normalize - <arbeitsordner>
//     -> wandelt .mov-Videos im Speicher in MP4 (H.264) um, damit jeder Browser sie abspielt.
//
// media-list.json: [{ table, id, kind: "photo"|"video", src, dst }]
// Uebernommen werden Creator und offene Bewerbungen, keine abgelehnten.
import { readFileSync, writeFileSync, mkdirSync, rmSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const [mode, listFile] = process.argv.slice(2);
if (!["prepare", "finalize", "large-prepare", "large-run", "normalize"].includes(mode) || !listFile) {
  console.error("Aufruf: node scripts/copy-lovable-media.mjs prepare|finalize|large-prepare|large-run <media-list.json> [ordner]");
  process.exit(1);
}
const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const BUCKET = "creator-media";
const TMP = "media-transfer"; // temporaerer privater Speicher nur fuer den Auftrag
const JOB = "job.json";
const list = mode === "normalize" ? [] : JSON.parse(readFileSync(listFile, "utf8"));

/** Video auf H.264/MP4 unter 48 MB bringen. Gibt { seconds, mb } zurueck. */
function transcode(ffmpeg, src, dst) {
  let seconds = 60;
  try {
    execFileSync(ffmpeg, ["-hide_banner", "-i", src], { stdio: ["ignore", "ignore", "pipe"] });
  } catch (e) {
    const m = String(e.stderr ?? "").match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
    if (m) seconds = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  }
  const kbit = Math.max(600, Math.min(6000, Math.floor((44 * 8 * 1000) / Math.max(1, seconds)) - 128));
  execFileSync(ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", "-i", src, "-vf", "scale='min(1080,iw)':-2", "-c:v", "libx264", "-preset", "medium", "-b:v", `${kbit}k`, "-maxrate", `${kbit}k`, "-bufsize", `${kbit * 2}k`, "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", dst]);
  return { seconds, mb: statSync(dst).size / 1e6 };
}

/** Eintraege, deren Datei noch nicht im Speicher liegt. */
async function missingEntries() {
  const out = [];
  for (const f of list) {
    const dir = f.dst.slice(0, f.dst.lastIndexOf("/"));
    const { data } = await db.storage.from(BUCKET).list(dir);
    if (!data?.some((o) => o.name.startsWith(`${f.kind}.`))) out.push(f);
  }
  return out;
}
const LINKS = "large-links.json";

if (mode === "large-prepare") {
  const todo = await missingEntries();
  await db.storage.createBucket(TMP, { public: false }).catch(() => null);
  const { data, error } = await db.storage.from(TMP).createSignedUploadUrl(LINKS, { upsert: true });
  if (error) throw new Error(error.message);
  console.log(`${todo.length} Dateien fehlen. Quellpfade:`);
  console.log(JSON.stringify(todo.map((f) => f.src)));
  console.log("Upload-Link fuer die Lese-Links:");
  console.log(data.signedUrl);
} else if (mode === "large-run") {
  const work = process.argv[4];
  if (!work) throw new Error("Arbeitsordner fehlt");
  const ffmpeg = process.env.FFMPEG ?? "ffmpeg";
  const { data: blob, error } = await db.storage.from(TMP).download(LINKS);
  if (error) throw new Error(error.message);
  const links = JSON.parse(await blob.text());
  const todo = await missingEntries();
  mkdirSync(work, { recursive: true });
  let ok = 0;
  try {
    for (const [i, f] of todo.entries()) {
      const url = links[f.src];
      if (!url) {
        console.log(`#${i + 1}: kein Lese-Link`);
        continue;
      }
      const src = join(work, `in-${i}`);
      const dst = join(work, `out-${i}.mp4`);
      const r = await fetch(url);
      if (!r.ok) throw new Error(`lesen ${r.status}`);
      writeFileSync(src, Buffer.from(await r.arrayBuffer()));
      const inMb = statSync(src).size / 1e6;
      const { seconds, mb: outMb } = transcode(ffmpeg, src, dst);
      if (outMb > 49) {
        console.log(`#${i + 1}: auch verkleinert zu gross (${outMb.toFixed(1)} MB)`);
        continue;
      }
      const path = f.dst.replace(/\.[a-z0-9]+$/i, ".mp4");
      const up = await db.storage.from(BUCKET).upload(path, readFileSync(dst), { contentType: "video/mp4", upsert: true });
      if (up.error) throw new Error(up.error.message);
      const u = await db.from(f.table).update({ [`${f.kind}_file`]: path }).eq("id", f.id);
      if (u.error) throw new Error(u.error.message);
      console.log(`#${i + 1}: ${inMb.toFixed(0)} MB -> ${outMb.toFixed(1)} MB (${Math.round(seconds)} s)`);
      ok++;
      rmSync(src, { force: true });
      rmSync(dst, { force: true });
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
    await db.storage.from(TMP).remove([LINKS]);
    await db.storage.deleteBucket(TMP);
  }
  console.log(`Grosse Videos uebernommen: ${ok} von ${todo.length}. Lokale Kopien geloescht.`);
} else if (mode === "normalize") {
  const work = process.argv[4];
  if (!work) throw new Error("Arbeitsordner fehlt");
  const ffmpeg = process.env.FFMPEG ?? "ffmpeg";
  mkdirSync(work, { recursive: true });
  let ok = 0;
  try {
    for (const table of ["creators", "creator_applications"]) {
      const { data } = await db.from(table).select("id, video_file").ilike("video_file", "%.mov");
      for (const [i, r] of (data ?? []).entries()) {
        const src = join(work, `n-${table}-${i}.mov`);
        const dst = join(work, `n-${table}-${i}.mp4`);
        const { data: blob, error } = await db.storage.from(BUCKET).download(r.video_file);
        if (error) throw new Error(error.message);
        writeFileSync(src, Buffer.from(await blob.arrayBuffer()));
        const t = transcode(ffmpeg, src, dst);
        if (t.mb > 49) {
          console.log(`${table} #${i + 1}: zu gross (${t.mb.toFixed(1)} MB), bleibt .mov`);
          continue;
        }
        const path = r.video_file.replace(/\.mov$/i, ".mp4");
        const up = await db.storage.from(BUCKET).upload(path, readFileSync(dst), { contentType: "video/mp4", upsert: true });
        if (up.error) throw new Error(up.error.message);
        const u = await db.from(table).update({ video_file: path }).eq("id", r.id);
        if (u.error) throw new Error(u.error.message);
        await db.storage.from(BUCKET).remove([r.video_file]);
        console.log(`${table} #${i + 1}: ${(statSync(src).size / 1e6).toFixed(1)} MB .mov -> ${t.mb.toFixed(1)} MB .mp4`);
        rmSync(src, { force: true });
        rmSync(dst, { force: true });
        ok++;
      }
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
  console.log(`Umgewandelt: ${ok}. Lokale Kopien geloescht.`);
} else if (mode === "prepare") {
  const job = [];
  for (const f of list) {
    const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(f.dst, { upsert: true });
    if (error) throw new Error(`${f.dst}: ${error.message}`);
    job.push({ src: f.src, dst: f.dst, put: data.signedUrl });
  }
  await db.storage.createBucket(TMP, { public: false }).catch(() => null);
  const up = await db.storage.from(TMP).upload(JOB, JSON.stringify(job), { contentType: "application/json", upsert: true });
  if (up.error) throw new Error(up.error.message);
  const { data, error } = await db.storage.from(TMP).createSignedUrl(JOB, 900);
  if (error) throw new Error(error.message);
  console.log(`Auftrag mit ${job.length} Dateien bereit (15 Min. gueltig):`);
  console.log(data.signedUrl);
} else {
  let ok = 0;
  const missing = [];
  for (const f of list) {
    const dir = f.dst.slice(0, f.dst.lastIndexOf("/"));
    const name = f.dst.slice(f.dst.lastIndexOf("/") + 1);
    const { data } = await db.storage.from(BUCKET).list(dir, { search: name });
    const hit = data?.find((o) => o.name === name);
    if (!hit) {
      missing.push(`${f.table}/${f.kind}`);
      continue;
    }
    const { error } = await db.from(f.table).update({ [`${f.kind}_file`]: f.dst }).eq("id", f.id);
    if (error) throw new Error(error.message);
    ok++;
  }
  await db.storage.from(TMP).remove([JOB]);
  const del = await db.storage.deleteBucket(TMP);
  if (del.error) console.log("Temporaerer Speicher nicht geloescht:", del.error.message);
  console.log(`Uebernommen: ${ok} von ${list.length}. Fehlend: ${missing.length}`, missing.length ? missing : "");
}
