"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  FolderPlus,
  Paperclip,
  StickyNote,
  UserPlus,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  PROJECT_TYPES,
  PROJECT_STATUSES,
  PRIORITIES,
  FILE_CATEGORIES,
} from "@/config/catalog";
import {
  createProjectAction,
  createFileAction,
  createContactAction,
  createClientInteractionAction,
} from "@/app/(app)/clients/actions";
import type { ProfileMini } from "@/types/entities";

const field =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

function Lbl({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-sm font-medium text-neutral-700">{children}</label>;
}

function SubmitBtn({ pending, label }: { pending: boolean; label: string }) {
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {label}
    </Button>
  );
}

/* ------------------------------------------------------------------ Projekt */
export function ProjectQuickCreate({
  clientId,
  users,
  variant = "secondary",
  label = "Projekt",
}: {
  clientId: string;
  users: ProfileMini[];
  variant?: "primary" | "secondary" | "ghost";
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    project_type: PROJECT_TYPES[0].key as string,
    status: "planned",
    priority: "medium",
    owner_id: "",
    due_date: "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function submit() {
    if (!form.title.trim()) {
      setError("Titel ist Pflicht.");
      return;
    }
    setError(null);
    start(async () => {
      const r = await createProjectAction({
        client_id: clientId,
        title: form.title,
        project_type: form.project_type as never,
        status: form.status as never,
        priority: form.priority as never,
        owner_id: form.owner_id || undefined,
        due_date: form.due_date || undefined,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setOpen(false);
      setForm((f) => ({ ...f, title: "", due_date: "" }));
      router.refresh();
    });
  }

  return (
    <>
      <Button variant={variant} size="sm" onClick={() => setOpen(true)}>
        <FolderPlus className="h-4 w-4" aria-hidden="true" />
        {label}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Projekt erstellen">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-3"
        >
          <div>
            <Lbl>Titel</Lbl>
            <input className={field} value={form.title} onChange={(e) => set("title", e.target.value)} autoFocus />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Lbl>Typ</Lbl>
              <select className={field} value={form.project_type} onChange={(e) => set("project_type", e.target.value)}>
                {PROJECT_TYPES.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Lbl>Status</Lbl>
              <select className={field} value={form.status} onChange={(e) => set("status", e.target.value)}>
                {PROJECT_STATUSES.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Lbl>Prioritaet</Lbl>
              <select className={field} value={form.priority} onChange={(e) => set("priority", e.target.value)}>
                {PRIORITIES.map((p) => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Lbl>Deadline</Lbl>
              <input type="date" className={field} value={form.due_date} onChange={(e) => set("due_date", e.target.value)} />
            </div>
          </div>
          <div>
            <Lbl>Verantwortlich</Lbl>
            <select className={field} value={form.owner_id} onChange={(e) => set("owner_id", e.target.value)}>
              <option value="">(keiner)</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name ?? u.id}</option>
              ))}
            </select>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Abbrechen</Button>
            <SubmitBtn pending={pending} label="Projekt erstellen" />
          </div>
        </form>
      </Modal>
    </>
  );
}

/* -------------------------------------------------------------------- Datei */
export function FileQuickCreate({
  clientId,
  variant = "secondary",
  label = "Datei",
}: {
  clientId: string;
  variant?: "primary" | "secondary" | "ghost";
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [form, setForm] = useState({ filename: "", file_url: "", category: "other" });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) set("filename", dropped.name);
    const uri = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
    if (uri && /^https?:\/\//i.test(uri.trim())) set("file_url", uri.trim());
  }

  function submit() {
    if (!form.filename.trim() || !form.file_url.trim()) {
      setError("Dateiname und Link sind Pflicht.");
      return;
    }
    setError(null);
    start(async () => {
      const r = await createFileAction({
        client_id: clientId,
        filename: form.filename,
        file_url: form.file_url,
        category: form.category as never,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setOpen(false);
      setForm({ filename: "", file_url: "", category: "other" });
      router.refresh();
    });
  }

  return (
    <>
      <Button variant={variant} size="sm" onClick={() => setOpen(true)}>
        <Paperclip className="h-4 w-4" aria-hidden="true" />
        {label}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Datei verknuepfen">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-3"
        >
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={
              "flex flex-col items-center gap-1 rounded-xl border-2 border-dashed px-4 py-6 text-center text-sm transition-colors " +
              (dragOver ? "border-brand-400 bg-brand-50" : "border-neutral-300 bg-neutral-50")
            }
          >
            <UploadCloud className="h-6 w-6 text-neutral-400" aria-hidden="true" />
            <span className="font-medium text-neutral-700">Datei oder Link hierher ziehen</span>
            <span className="text-xs text-neutral-400">
              Dateien werden als Link verknuepft (z.B. Google Drive, Dropbox).
            </span>
          </div>
          <div>
            <Lbl>Dateiname</Lbl>
            <input className={field} value={form.filename} onChange={(e) => set("filename", e.target.value)} placeholder="z.B. Vertrag_2026.pdf" />
          </div>
          <div>
            <Lbl>Link (URL)</Lbl>
            <input className={field} value={form.file_url} onChange={(e) => set("file_url", e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <Lbl>Kategorie</Lbl>
            <select className={field} value={form.category} onChange={(e) => set("category", e.target.value)}>
              {FILE_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Abbrechen</Button>
            <SubmitBtn pending={pending} label="Verknuepfen" />
          </div>
        </form>
      </Modal>
    </>
  );
}

/* -------------------------------------------------------------------- Notiz */
export function NoteQuickCreate({
  clientId,
  variant = "secondary",
  label = "Notiz",
}: {
  clientId: string;
  variant?: "primary" | "secondary" | "ghost";
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  function submit() {
    if (!body.trim()) {
      setError("Notiz darf nicht leer sein.");
      return;
    }
    setError(null);
    start(async () => {
      const r = await createClientInteractionAction({
        client_id: clientId,
        type: "note",
        subject: subject.trim() || undefined,
        body: body.trim(),
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setOpen(false);
      setSubject("");
      setBody("");
      router.refresh();
    });
  }

  return (
    <>
      <Button variant={variant} size="sm" onClick={() => setOpen(true)}>
        <StickyNote className="h-4 w-4" aria-hidden="true" />
        {label}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Notiz hinzufuegen">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-3"
        >
          <div>
            <Lbl>Titel (optional)</Lbl>
            <input className={field} value={subject} onChange={(e) => setSubject(e.target.value)} autoFocus />
          </div>
          <div>
            <Lbl>Notiz</Lbl>
            <textarea className={field} rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Abbrechen</Button>
            <SubmitBtn pending={pending} label="Speichern" />
          </div>
        </form>
      </Modal>
    </>
  );
}

/* ------------------------------------------------------------ Ansprechpartner */
export function ContactQuickCreate({
  clientId,
  variant = "secondary",
  label = "Ansprechpartner",
}: {
  clientId: string;
  variant?: "primary" | "secondary" | "ghost";
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    position: "",
    is_primary: false,
  });
  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  function submit() {
    if (!form.first_name.trim()) {
      setError("Name ist Pflicht.");
      return;
    }
    setError(null);
    start(async () => {
      const r = await createContactAction({
        client_id: clientId,
        first_name: form.first_name,
        last_name: form.last_name || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        position: form.position || undefined,
        is_primary: form.is_primary,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setOpen(false);
      setForm({ first_name: "", last_name: "", email: "", phone: "", position: "", is_primary: false });
      router.refresh();
    });
  }

  return (
    <>
      <Button variant={variant} size="sm" onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" aria-hidden="true" />
        {label}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Ansprechpartner hinzufuegen">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-3"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Lbl>Vorname</Lbl>
              <input className={field} value={form.first_name} onChange={(e) => set("first_name", e.target.value)} autoFocus />
            </div>
            <div>
              <Lbl>Nachname</Lbl>
              <input className={field} value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
            </div>
            <div>
              <Lbl>E-Mail</Lbl>
              <input type="email" className={field} value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div>
              <Lbl>Telefon</Lbl>
              <input className={field} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
          </div>
          <div>
            <Lbl>Position</Lbl>
            <input className={field} value={form.position} onChange={(e) => set("position", e.target.value)} placeholder="z.B. Geschaeftsfuehrer" />
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input type="checkbox" checked={form.is_primary} onChange={(e) => set("is_primary", e.target.checked)} className="h-4 w-4 rounded border-neutral-300 text-brand-600" />
            Hauptansprechpartner
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Abbrechen</Button>
            <SubmitBtn pending={pending} label="Hinzufuegen" />
          </div>
        </form>
      </Modal>
    </>
  );
}
