import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  EFFECTIVE_SUPABASE_URL,
  EFFECTIVE_SUPABASE_ANON_KEY,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

/**
 * Oeffentliche Pfade ohne Login. Eingehende Webhooks (z.B. Meta Lead Ads)
 * werden von externen Servern OHNE Session aufgerufen und duerfen daher nicht
 * auf /login umgeleitet werden.
 */
const PUBLIC_PATHS = [
  "/login",
  "/api/webhooks",
  "/api/cron",
  // Kalender-Feed: Google/Outlook rufen ihn ohne Session ab (Token-geschuetzt).
  "/api/calendar",
];

/**
 * Offene Seiten fuer Kunden, Creator und Interessenten (ohne Login, auch fuer
 * eingeloggte Nutzer erreichbar). Zugriff auf Daten nur ueber Token, serverseitig.
 */
const OPEN_PATHS = ["/model", "/onboarding", "/signieren", "/shoot-review"];

export function isOpenPath(pathname: string): boolean {
  return OPEN_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * Aktualisiert die Supabase-Session bei jedem Request (Cookie-Rotation) und
 * setzt die Zugriffsregeln fuer geschuetzte Routen durch.
 */
export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  // Oeffentliche Kundenseiten: keine Anmeldung, keine Umleitung, keine Session-Abfrage.
  if (isOpenPath(pathname)) {
    supabaseResponse.headers.set("X-Robots-Tag", "noindex, nofollow");
    return supabaseResponse;
  }

  // Supabase nicht konfiguriert:
  // - lokal (dev): alles durchlassen, damit das UI begehbar ist
  // - produktiv: nur oeffentliche Pfade zulassen
  if (!isSupabaseConfigured()) {
    if (process.env.NODE_ENV !== "production") return supabaseResponse;
    if (!isPublicPath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(
    EFFECTIVE_SUPABASE_URL,
    EFFECTIVE_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // WICHTIG: getUser() validiert das Token serverseitig (nicht nur das Cookie).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Nicht eingeloggt + geschuetzte Seite -> Login
  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }

  // Eingeloggt + auf einer oeffentlichen Auth-Seite -> ins Dashboard
  if (user && isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
