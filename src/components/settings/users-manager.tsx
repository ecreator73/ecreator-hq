"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus, ShieldCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/avatar";
import { ROLES, roleLabel, type RoleKey } from "@/config/roles";
import {
  createUserAction,
  setUserRolesAction,
  setUserActiveAction,
} from "@/app/(app)/settings/users/actions";

export interface ManagedUser {
  id: string;
  full_name: string | null;
  email: string | null;
  is_active: boolean;
  roleKeys: string[];
}

const field =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

function randomPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!?$%";
  const arr = new Uint32Array(14);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join("");
}

export function UsersManager({
  users,
  canManage,
  currentUserId,
}: {
  users: ManagedUser[];
  canManage: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [rolesFor, setRolesFor] = useState<ManagedUser | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Create-Form
  const [form, setForm] = useState({ email: "", full_name: "", password: "", role: "sales" as string });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function submitCreate() {
    if (!form.email.trim() || form.password.length < 8) {
      setError("E-Mail und Passwort (min. 8 Zeichen) erforderlich.");
      return;
    }
    setError(null);
    start(async () => {
      const r = await createUserAction(form);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setCreateOpen(false);
      setForm({ email: "", full_name: "", password: "", role: "sales" });
      router.refresh();
    });
  }

  function toggleActive(u: ManagedUser) {
    start(async () => {
      const r = await setUserActiveAction(u.id, !u.is_active);
      if (!r.ok) setError(r.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {canManage ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-500">{users.length} Konto(en)</p>
          <Button onClick={() => { setError(null); setCreateOpen(true); }}>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Benutzer anlegen
          </Button>
        </div>
      ) : null}

      {error && !createOpen && !rolesFor ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-400">
            <tr>
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">E-Mail</th>
              <th className="px-4 py-2.5 font-medium">Rollen</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              {canManage ? <th className="px-4 py-2.5 font-medium">Aktionen</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {users.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 5 : 4} className="px-4 py-8 text-center text-sm text-neutral-400">
                  Noch keine Benutzer{canManage ? " – lege oben den ersten an." : "."}
                </td>
              </tr>
            ) : null}
            {users.map((u) => {
              const name = u.full_name ?? u.email ?? "Unbenannt";
              return (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={name} />
                      <span className="font-medium text-neutral-900">{name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{u.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.roleKeys.length > 0 ? (
                        u.roleKeys.map((k) => (
                          <Badge key={k} tone="brand">{roleLabel(k)}</Badge>
                        ))
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {u.is_active ? <Badge tone="green">Aktiv</Badge> : <Badge tone="red">Inaktiv</Badge>}
                  </td>
                  {canManage ? (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={() => { setError(null); setRolesFor(u); }}>
                          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                          Rollen
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => toggleActive(u)} disabled={pending}>
                          {u.is_active ? "Deaktivieren" : "Aktivieren"}
                        </Button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Anlegen */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Benutzer anlegen">
        <form onSubmit={(e) => { e.preventDefault(); submitCreate(); }} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Name</label>
            <input className={field} value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Vor- und Nachname" autoFocus />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">E-Mail</label>
            <input type="email" className={field} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="name@ecreator.ch" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Startpasswort</label>
            <div className="flex gap-2">
              <input className={field} value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="min. 8 Zeichen" />
              <Button type="button" variant="secondary" onClick={() => set("password", randomPassword())}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            <p className="mt-1 text-xs text-neutral-400">Teile es der Person mit — sie kann es danach selbst ändern.</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Rolle</label>
            <select className={field} value={form.role} onChange={(e) => set("role", e.target.value)}>
              {ROLES.map((r) => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </select>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Abbrechen</Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Anlegen
            </Button>
          </div>
        </form>
      </Modal>

      {/* Rollen bearbeiten */}
      {rolesFor ? (
        <RolesModal
          user={rolesFor}
          currentUserId={currentUserId}
          onClose={() => setRolesFor(null)}
          onSaved={() => { setRolesFor(null); router.refresh(); }}
        />
      ) : null}
    </div>
  );
}

function RolesModal({
  user,
  currentUserId,
  onClose,
  onSaved,
}: {
  user: ManagedUser;
  currentUserId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(user.roleKeys));
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(k: RoleKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  }
  function save() {
    setError(null);
    start(async () => {
      const r = await setUserRolesAction(user.id, [...selected]);
      if (!r.ok) { setError(r.error); return; }
      onSaved();
    });
  }

  return (
    <Modal open onClose={onClose} title={`Rollen — ${user.full_name ?? user.email}`}>
      <div className="space-y-2">
        {ROLES.map((r) => (
          <label key={r.key} className="flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-200 p-2.5 hover:bg-neutral-50">
            <input
              type="checkbox"
              checked={selected.has(r.key)}
              onChange={() => toggle(r.key)}
              className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-brand-600"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-neutral-900">{r.label}</span>
              <span className="block text-xs text-neutral-500">{r.description}</span>
            </span>
          </label>
        ))}
        {user.id === currentUserId ? (
          <p className="text-xs text-amber-600">Hinweis: Du kannst dir die Super-Admin-Rolle nicht selbst entziehen.</p>
        ) : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>Abbrechen</Button>
          <Button onClick={save} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Speichern
          </Button>
        </div>
      </div>
    </Modal>
  );
}
