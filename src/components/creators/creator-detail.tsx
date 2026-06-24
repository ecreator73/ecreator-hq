"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Instagram, Music2, ExternalLink } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusSelect } from "@/components/production/status-select";
import { StarRating } from "@/components/creators/star-rating";
import { CreatorForm } from "@/components/creators/creator-form";
import { AssignmentsPanel } from "@/components/creators/assignments-panel";
import { RatingPanel } from "@/components/creators/rating-panel";
import { AvailabilityPanel } from "@/components/creators/availability-panel";
import { PortfolioPanel } from "@/components/creators/portfolio-panel";
import { setCreatorStatusAction } from "@/app/(app)/production/creators/actions";
import {
  CREATOR_STATUSES,
  CREATOR_TYPE_LABELS,
  CREATOR_LANGUAGE_LABELS,
  EXPERIENCE_LEVEL_LABELS,
  GENDER_LABELS,
  CREATOR_GROUP_STATUS_LABELS,
} from "@/config/catalog";
import { cn, formatDate, formatCHF } from "@/lib/utils";
import type {
  CreatorWithStats,
  CreatorAsset,
  CreatorAvailability,
  CreatorRating,
  ShootAssignmentWithRelations,
} from "@/types/entities";

const TABS = [
  { key: "overview", label: "Uebersicht" },
  { key: "social", label: "Social Media" },
  { key: "shootings", label: "Shootings" },
  { key: "ratings", label: "Bewertungen" },
  { key: "availability", label: "Verfuegbarkeit" },
  { key: "files", label: "Dateien" },
  { key: "activity", label: "Aktivitaet" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function fullName(c: CreatorWithStats): string {
  return [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
}

/** Catalog-Farbe -> Badge-Tone fuer den Score. */
function scoreTone(score: number): "green" | "amber" | "neutral" {
  if (score >= 75) return "green";
  if (score >= 40) return "amber";
  return "neutral";
}

export function CreatorDetail({
  creator,
  assignments,
  ratings,
  availability,
  portfolio,
  shoots,
}: {
  creator: CreatorWithStats;
  assignments: ShootAssignmentWithRelations[];
  ratings: CreatorRating[];
  availability: CreatorAvailability[];
  portfolio: CreatorAsset[];
  shoots: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("overview");
  const [editing, setEditing] = useState(false);

  return (
    <div className="space-y-5">
      <Link
        href="/production/creators/list"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurueck zum Pool
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
              {fullName(creator)}
            </h1>
            <Badge tone={scoreTone(creator.score)}>
              Score {creator.score}
            </Badge>
            {creator.rating_avg != null ? (
              <span className="inline-flex items-center gap-1.5">
                <StarRating value={creator.rating_avg} size={16} />
                <span className="text-sm text-neutral-500">
                  {creator.rating_avg.toFixed(1)}
                  {creator.rating_count > 0 ? ` (${creator.rating_count})` : ""}
                </span>
              </span>
            ) : null}
          </div>
          <div className="text-sm text-neutral-500">
            {[creator.city, creator.canton].filter(Boolean).join(", ") || "-"}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusSelect
            id={creator.id}
            value={creator.status}
            statuses={CREATOR_STATUSES}
            action={setCreatorStatusAction}
          />
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" />
            Bearbeiten
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <nav className="flex gap-1 overflow-x-auto border-b border-neutral-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === t.key
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-neutral-500 hover:text-neutral-800",
            )}
          >
            {t.label}
            {t.key === "shootings" && assignments.length > 0
              ? ` (${assignments.length})`
              : ""}
            {t.key === "ratings" && ratings.length > 0
              ? ` (${ratings.length})`
              : ""}
            {t.key === "availability" && availability.length > 0
              ? ` (${availability.length})`
              : ""}
            {t.key === "files" && portfolio.length > 0
              ? ` (${portfolio.length})`
              : ""}
          </button>
        ))}
      </nav>

      <Card>
        <CardContent className="p-5 sm:p-6">
          {tab === "overview" ? (
            <OverviewTab creator={creator} />
          ) : tab === "social" ? (
            <SocialTab creator={creator} />
          ) : tab === "shootings" ? (
            <AssignmentsPanel assignments={assignments} mode="creator" />
          ) : tab === "ratings" ? (
            <RatingPanel
              creatorId={creator.id}
              items={ratings}
              shoots={shoots}
            />
          ) : tab === "availability" ? (
            <AvailabilityPanel creatorId={creator.id} items={availability} />
          ) : tab === "files" ? (
            <PortfolioPanel creatorId={creator.id} items={portfolio} />
          ) : (
            <EmptyState
              title="Aktivitaet folgt"
              description="Der Aktivitaetsverlauf fuer Creator wird hier angezeigt."
            />
          )}
        </CardContent>
      </Card>

      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Creator bearbeiten"
        size="lg"
      >
        <CreatorForm
          mode="edit"
          id={creator.id}
          initial={creator}
          onCancel={() => setEditing(false)}
          onDone={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      </Modal>
    </div>
  );
}

/* ----------------------------------------------------------------------- */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-neutral-800">{children}</dd>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-neutral-800">{title}</h2>
      {children}
    </section>
  );
}

function OverviewTab({ creator }: { creator: CreatorWithStats }) {
  const region = [creator.city, creator.canton, creator.country]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-7">
      <Section title="Stammdaten">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Vorname">{creator.first_name || "-"}</Field>
          <Field label="Nachname">{creator.last_name || "-"}</Field>
          <Field label="Geschlecht">
            {creator.gender
              ? (GENDER_LABELS[creator.gender as keyof typeof GENDER_LABELS] ??
                creator.gender)
              : "-"}
          </Field>
          <Field label="Jahrgang">{creator.birth_year ?? "-"}</Field>
        </dl>
      </Section>

      <Section title="Kontakt">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="E-Mail">
            {creator.email ? (
              <a
                href={`mailto:${creator.email}`}
                className="text-brand-700 hover:underline"
              >
                {creator.email}
              </a>
            ) : (
              "-"
            )}
          </Field>
          <Field label="Telefon">
            {creator.phone ? (
              <a
                href={`tel:${creator.phone}`}
                className="text-brand-700 hover:underline"
              >
                {creator.phone}
              </a>
            ) : (
              "-"
            )}
          </Field>
        </dl>
      </Section>

      <Section title="Region">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Ort / Kanton / Land">{region || "-"}</Field>
          <Field label="Reisebereit">
            {creator.travel_available ? (
              <Badge tone="green">Ja</Badge>
            ) : (
              <Badge tone="neutral">Nein</Badge>
            )}
          </Field>
        </dl>
      </Section>

      <Section title="Preise">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Stundensatz">
            {creator.hourly_rate != null ? formatCHF(creator.hourly_rate) : "-"}
          </Field>
          <Field label="Halbtagessatz">
            {creator.half_day_rate != null
              ? formatCHF(creator.half_day_rate)
              : "-"}
          </Field>
          <Field label="Tagessatz">
            {creator.full_day_rate != null
              ? formatCHF(creator.full_day_rate)
              : "-"}
          </Field>
          <Field label="Reisekosten">
            {creator.travel_costs != null
              ? formatCHF(creator.travel_costs)
              : "-"}
          </Field>
          <Field label="Zusatzkosten">
            {creator.additional_costs != null
              ? formatCHF(creator.additional_costs)
              : "-"}
          </Field>
        </dl>
      </Section>

      <Section title="Profil">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Creator-Typen">
            {creator.creator_types.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {creator.creator_types.map((t) => (
                  <Badge key={t} tone="brand">
                    {CREATOR_TYPE_LABELS[
                      t as keyof typeof CREATOR_TYPE_LABELS
                    ] ?? t}
                  </Badge>
                ))}
              </div>
            ) : (
              "-"
            )}
          </Field>
          <Field label="Sprachen">
            {creator.languages.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {creator.languages.map((l) => (
                  <Badge key={l} tone="neutral">
                    {CREATOR_LANGUAGE_LABELS[
                      l as keyof typeof CREATOR_LANGUAGE_LABELS
                    ] ?? l}
                  </Badge>
                ))}
              </div>
            ) : (
              "-"
            )}
          </Field>
          <Field label="Erfahrung">
            {creator.experience_level
              ? (EXPERIENCE_LEVEL_LABELS[
                  creator.experience_level as keyof typeof EXPERIENCE_LEVEL_LABELS
                ] ?? creator.experience_level)
              : "-"}
          </Field>
        </dl>
      </Section>

      <Section title="Tags">
        {creator.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {creator.tags.map((t) => (
              <Badge key={t} tone="neutral">
                {t}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-400">Keine Tags.</p>
        )}
      </Section>

      <Section title="Organisation">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="WhatsApp-Gruppe">
            {CREATOR_GROUP_STATUS_LABELS[
              creator.creator_group_status as keyof typeof CREATOR_GROUP_STATUS_LABELS
            ] ?? creator.creator_group_status}
          </Field>
        </dl>
      </Section>

      <Section title="Datenschutz (DSG)">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Einwilligung">
            {creator.consent_given ? (
              <Badge tone="green">Ja</Badge>
            ) : (
              <Badge tone="red">Nein</Badge>
            )}
          </Field>
          <Field label="Datum">
            {creator.consent_date ? formatDate(creator.consent_date) : "-"}
          </Field>
          <Field label="Notiz">{creator.consent_note || "-"}</Field>
        </dl>
      </Section>

      {creator.notes ? (
        <Section title="Notizen">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
            {creator.notes}
          </p>
        </Section>
      ) : null}
    </div>
  );
}

function SocialTab({ creator }: { creator: CreatorWithStats }) {
  const hasInstagram = Boolean(creator.instagram_handle);
  const hasTiktok = Boolean(creator.tiktok_handle);

  if (!hasInstagram && !hasTiktok) {
    return (
      <EmptyState
        title="Keine Social-Media-Profile"
        description="Fuer diesen Creator sind keine Instagram- oder TikTok-Handles hinterlegt."
      />
    );
  }

  const igHandle = (creator.instagram_handle ?? "").replace(/^@/, "");
  const ttHandle = (creator.tiktok_handle ?? "").replace(/^@/, "");

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {hasInstagram ? (
        <SocialCard
          icon={<Instagram className="h-5 w-5" />}
          platform="Instagram"
          handle={creator.instagram_handle}
          followers={creator.instagram_followers}
          url={`https://instagram.com/${igHandle}`}
        />
      ) : null}
      {hasTiktok ? (
        <SocialCard
          icon={<Music2 className="h-5 w-5" />}
          platform="TikTok"
          handle={creator.tiktok_handle}
          followers={creator.tiktok_followers}
          url={`https://tiktok.com/@${ttHandle}`}
        />
      ) : null}
    </div>
  );
}

function SocialCard({
  icon,
  platform,
  handle,
  followers,
  url,
}: {
  icon: React.ReactNode;
  platform: string;
  handle: string | null;
  followers: number | null;
  url: string;
}) {
  const display = handle ? (handle.startsWith("@") ? handle : `@${handle}`) : "";
  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <div className="flex items-center gap-2 text-neutral-700">
        {icon}
        <span className="text-sm font-semibold">{platform}</span>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
      >
        {display}
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
      <p className="mt-2 text-xs text-neutral-500">
        {followers != null
          ? `${followers.toLocaleString("de-CH")} Follower`
          : "Follower unbekannt"}
      </p>
    </div>
  );
}
