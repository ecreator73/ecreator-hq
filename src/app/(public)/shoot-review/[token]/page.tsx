import type { Metadata } from "next";
import { CalendarDays, ExternalLink, MapPin, User } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicMessage, PublicPage } from "@/components/public/public-frame";
import { ShootReviewPanel } from "@/components/public/shoot-review-panel";

export const metadata: Metadata = { title: { absolute: "Shooting-Durchsicht · eCreator" } };
export const dynamic = "force-dynamic";

const TZ = "Europe/Zurich";
const dLong = new Intl.DateTimeFormat("de-CH", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
const href = (u: string) => (/^https?:\/\//.test(u) ? u : `https://${u}`);

export default async function ShootReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[\w-]{20,100}$/.test(token)) return <PublicMessage title="Dieser Link ist nicht gültig." />;
  const db = createAdminClient();
  const { data: s } = await db
    .from("shoots")
    .select("id, title, shooting_date, final_date_set, location, address, duration_hours, status, delivery_url, script_url, content_goal, client:clients!shoots_client_id_fkey(name)")
    .eq("share_token", token)
    .is("deleted_at", null)
    .maybeSingle();
  if (!s) return <PublicMessage title="Dieser Link ist nicht gültig.">Bitte wenden Sie sich an Ihre Ansprechperson bei eCreator.</PublicMessage>;

  const [scripts, options, model] = await Promise.all([
    db.from("shoot_scripts").select("id, video_number, title, hook, script, cta, status, customer_feedback, customer_decided_at").eq("shoot_id", s.id).order("video_number", { ascending: true, nullsFirst: false }),
    db.from("shoot_date_options").select("id, starts_at, customer_available").eq("shoot_id", s.id).order("starts_at"),
    db.from("shoot_assignments").select("status, creator:creators(first_name)").eq("shoot_id", s.id).is("deleted_at", null).in("status", ["confirmed", "done"]),
  ]);
  const modelNames = ((model.data ?? []) as unknown as Array<{ creator: { first_name: string } | null }>).map((m) => m.creator?.first_name).filter(Boolean);
  const client = (s.client as unknown as { name: string } | null)?.name;
  const fixed = s.shooting_date && s.final_date_set;

  return (
    <PublicPage badge="Durchsicht">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">{client ?? "Shooting"}</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">{s.title}</h1>
      <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-600">
        <li className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4" aria-hidden />
          {fixed ? dLong.format(new Date(s.shooting_date!)) : "Termin wird abgestimmt"}
          {fixed && s.duration_hours ? ` · ${s.duration_hours} Std.` : ""}
        </li>
        {s.location || s.address ? (
          <li className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4" aria-hidden /> {[s.location, s.address].filter(Boolean).join(", ")}
          </li>
        ) : null}
        {modelNames.length ? (
          <li className="inline-flex items-center gap-1.5">
            <User className="h-4 w-4" aria-hidden /> Model: {modelNames.join(", ")}
          </li>
        ) : null}
      </ul>
      {s.content_goal ? <p className="mt-4 whitespace-pre-line rounded-xl bg-neutral-50 p-4 text-sm text-neutral-700">{s.content_goal}</p> : null}
      {s.delivery_url ? (
        <a href={href(s.delivery_url)} target="_blank" rel="noreferrer" className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-5 font-semibold text-white hover:bg-brand-700">
          Videos ansehen <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
      ) : null}

      <ShootReviewPanel
        token={token}
        dateFixed={!!fixed}
        options={(options.data ?? []) as Array<{ id: string; starts_at: string; customer_available: boolean | null }>}
        scripts={(scripts.data ?? []) as Array<{ id: string; video_number: number | null; title: string | null; hook: string | null; script: string | null; cta: string | null; status: string; customer_feedback: string | null; customer_decided_at: string | null }>}
      />
    </PublicPage>
  );
}
