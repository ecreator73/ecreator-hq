"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  Mail,
  Phone,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/tasks/status-badge";
import { QuickCreate } from "@/components/tasks/quick-create";
import { ContactQuickCreate } from "@/components/clients/detail-quick-creates";
import {
  statusLabel,
  CLIENT_PACKAGE_LABELS,
  PROJECT_TYPES,
  CLIENT_INTERACTION_TYPE_LABELS,
} from "@/config/catalog";
import { formatDate, formatCHF, cn } from "@/lib/utils";
import {
  Section,
  List,
  Row,
  Meta,
  EmptyRow,
  statusColorOf,
  type TabKey,
} from "../detail-ui";
import type {
  ClientWithStats,
  Contract,
  Contact,
  Project,
  TaskWithRelations,
  ClientInteraction,
  ClientChecklist,
} from "@/types/entities";

const PROJECT_TYPE_MAP: Record<string, string> = Object.fromEntries(
  PROJECT_TYPES.map((t) => [t.key, t.label]),
);

const ACTIVE_PROJECT_STATUSES = ["planned", "active"];

const DASH = "—";

export function OverviewTab({
  client,
  contract,
  contacts,
  projects,
  tasks,
  interactions,
  checklists,
  onTab,
}: {
  client: ClientWithStats;
  contract: Contract | null;
  contracts: Contract[];
  contacts: Contact[];
  projects: Project[];
  tasks: TaskWithRelations[];
  interactions: ClientInteraction[];
  checklists: ClientChecklist[];
  onTab: (key: TabKey) => void;
}) {
  const openTasks = tasks.slice(0, 6);
  const activeProjects = projects.filter((p) =>
    ACTIVE_PROJECT_STATUSES.includes(p.status),
  );
  const recentInteractions = interactions.slice(0, 5);
  const packageLabel = client.package
    ? CLIENT_PACKAGE_LABELS[
        client.package as keyof typeof CLIENT_PACKAGE_LABELS
      ] ?? client.package
    : null;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* 1) Stammdaten */}
      <Section title="Stammdaten">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
          <Meta label="E-Mail">
            {client.email ? (
              <a
                href={`mailto:${client.email}`}
                className="text-brand-700 hover:underline"
              >
                {client.email}
              </a>
            ) : (
              DASH
            )}
          </Meta>
          <Meta label="Telefon">
            {client.phone ? (
              <a
                href={`tel:${client.phone}`}
                className="text-brand-700 hover:underline"
              >
                {client.phone}
              </a>
            ) : (
              DASH
            )}
          </Meta>
          <Meta label="Website">
            {client.website ? (
              <a
                href={client.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-brand-700 hover:underline"
              >
                <span className="truncate">
                  {client.website.replace(/^https?:\/\//, "")}
                </span>
                <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
              </a>
            ) : (
              DASH
            )}
          </Meta>
          <Meta label="Paket">{packageLabel ?? DASH}</Meta>
          <Meta label="Branche">{client.industry || DASH}</Meta>
          <Meta label="Ort">
            {[client.city, client.country].filter(Boolean).join(", ") || DASH}
          </Meta>
        </dl>
      </Section>

      {/* 2) Ansprechpartner */}
      <Section
        title="Ansprechpartner"
        action={
          <ContactQuickCreate
            clientId={client.id}
            variant="ghost"
            label="Hinzufuegen"
          />
        }
      >
        {contacts.length > 0 ? (
          <List>
            {contacts.map((c) => {
              const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
              return (
                <Row key={c.id}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-neutral-900">
                        {name || DASH}
                      </span>
                      {c.is_primary ? (
                        <Badge tone="brand">Haupt</Badge>
                      ) : null}
                    </div>
                    {c.position ? (
                      <p className="truncate text-xs text-neutral-500">
                        {c.position}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {c.email ? (
                      <a
                        href={`mailto:${c.email}`}
                        aria-label={`E-Mail an ${name}`}
                        title={c.email}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800"
                      >
                        <Mail className="h-4 w-4" aria-hidden="true" />
                      </a>
                    ) : null}
                    {c.phone ? (
                      <a
                        href={`tel:${c.phone}`}
                        aria-label={`Anrufen ${name}`}
                        title={c.phone}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800"
                      >
                        <Phone className="h-4 w-4" aria-hidden="true" />
                      </a>
                    ) : null}
                  </div>
                </Row>
              );
            })}
          </List>
        ) : (
          <EmptyRow>Noch keine Ansprechpartner hinterlegt.</EmptyRow>
        )}
      </Section>

      {/* 3) Vertrag & Laufzeit */}
      <Section
        title="Vertrag & Laufzeit"
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onTab("contracts")}
          >
            Alle Vertraege
          </Button>
        }
      >
        {contract ? (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
            <Meta label="Monatswert">
              {formatCHF(contract.value_monthly)}
            </Meta>
            <Meta label="Gesamtwert">{formatCHF(contract.value_total)}</Meta>
            <Meta label="Laufzeit">
              {contract.start_date ? formatDate(contract.start_date) : DASH}
              {" – "}
              {contract.end_date ? formatDate(contract.end_date) : "offen"}
            </Meta>
            <Meta label="Status">
              <StatusBadge
                label={statusLabel("contract", contract.status)}
                color={statusColorOf("contract", contract.status)}
              />
            </Meta>
            <Meta label="Kuendigungsfrist">
              {contract.cancellation_notice_days != null
                ? `${contract.cancellation_notice_days} Tage`
                : DASH}
            </Meta>
          </dl>
        ) : (
          <EmptyRow>Kein aktiver Vertrag hinterlegt.</EmptyRow>
        )}
      </Section>

      {/* 4) Offene Aufgaben */}
      <Section
        title="Offene Aufgaben"
        action={
          <div className="flex items-center gap-1">
            <QuickCreate
              initial={{ client_id: client.id }}
              label="Aufgabe"
              variant="secondary"
            />
            <Button variant="ghost" size="sm" onClick={() => onTab("tasks")}>
              Alle
            </Button>
          </div>
        }
      >
        {openTasks.length > 0 ? (
          <List>
            {openTasks.map((t) => (
              <Row key={t.id}>
                <Link
                  href={`/tasks/${t.id}`}
                  className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-800 hover:text-brand-700"
                >
                  {t.title}
                </Link>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusBadge label={t.status?.label} color={t.status?.color} />
                  <span className="hidden text-xs tabular-nums text-neutral-400 sm:inline">
                    {t.due_date ? formatDate(t.due_date) : DASH}
                  </span>
                </div>
              </Row>
            ))}
          </List>
        ) : (
          <EmptyRow>Keine offenen Aufgaben.</EmptyRow>
        )}
      </Section>

      {/* 5) Aktive Projekte */}
      <Section
        title="Aktive Projekte"
        action={
          <Button variant="ghost" size="sm" onClick={() => onTab("projects")}>
            Alle
          </Button>
        }
      >
        {activeProjects.length > 0 ? (
          <List>
            {activeProjects.map((p) => (
              <Row key={p.id}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-800">
                    {p.title}
                  </p>
                  <p className="truncate text-xs text-neutral-500">
                    {PROJECT_TYPE_MAP[p.project_type] ?? p.project_type}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusBadge
                    label={statusLabel("project", p.status)}
                    color={statusColorOf("project", p.status)}
                  />
                  <span className="hidden text-xs tabular-nums text-neutral-400 sm:inline">
                    {p.due_date ? formatDate(p.due_date) : DASH}
                  </span>
                </div>
              </Row>
            ))}
          </List>
        ) : (
          <EmptyRow>Keine aktiven Projekte.</EmptyRow>
        )}
      </Section>

      {/* 6) Letzte Aktivitaeten */}
      <Section
        title="Letzte Aktivitaeten"
        className="lg:col-span-2"
        action={
          <Button variant="ghost" size="sm" onClick={() => onTab("activity")}>
            Verlauf
          </Button>
        }
      >
        {recentInteractions.length > 0 ? (
          <ul className="space-y-3">
            {recentInteractions.map((it) => (
              <li key={it.id} className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-neutral-300"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">
                      {CLIENT_INTERACTION_TYPE_LABELS[
                        it.type as keyof typeof CLIENT_INTERACTION_TYPE_LABELS
                      ] ?? it.type}
                    </Badge>
                    {it.subject ? (
                      <span className="truncate text-sm font-medium text-neutral-800">
                        {it.subject}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-neutral-400">
                    <span className="tabular-nums">
                      {formatDate(it.interaction_date)}
                    </span>
                    {it.author?.full_name ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{it.author.full_name}</span>
                      </>
                    ) : null}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyRow>Noch keine Aktivitaeten erfasst.</EmptyRow>
        )}
      </Section>

      {/* Checklisten (Onboarding / Offboarding) */}
      {checklists.length > 0
        ? checklists.map((cl) => {
            const items = cl.items ?? [];
            const total = items.length;
            const done = items.filter((i) => i.completed).length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const title =
              cl.kind === "onboarding"
                ? "Onboarding"
                : cl.kind === "offboarding"
                  ? "Offboarding"
                  : cl.kind;
            return (
              <Section
                key={cl.id}
                title={`${title}-Checkliste`}
                description={`${done} von ${total} erledigt`}
              >
                <div
                  className="mb-4 h-2 w-full overflow-hidden rounded-full bg-neutral-100"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      done === total && total > 0
                        ? "bg-green-500"
                        : "bg-brand-500",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {total > 0 ? (
                  <ul className="space-y-2">
                    {items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        {item.completed ? (
                          <CheckCircle2
                            className="h-4 w-4 shrink-0 text-green-500"
                            aria-hidden="true"
                          />
                        ) : (
                          <Circle
                            className="h-4 w-4 shrink-0 text-neutral-300"
                            aria-hidden="true"
                          />
                        )}
                        <span
                          className={cn(
                            "truncate",
                            item.completed
                              ? "text-neutral-400 line-through"
                              : "text-neutral-700",
                          )}
                        >
                          {item.title}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyRow>Keine Eintraege in dieser Checkliste.</EmptyRow>
                )}
              </Section>
            );
          })
        : null}
    </div>
  );
}
