import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Alle Pfade ausser:
     * - _next/static, _next/image (Build-Assets)
     * - favicon und statische Bilddateien
     * - api-Routen sind absichtlich enthalten (auch sie sollen geschuetzt sein)
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
