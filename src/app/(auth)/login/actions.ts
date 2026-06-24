"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export interface LoginState {
  error?: string;
}

/**
 * Server Action: Anmeldung per E-Mail + Passwort ueber Supabase Auth.
 * Validierung und Auth-Aufruf passieren ausschliesslich serverseitig.
 */
export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  if (!isSupabaseConfigured()) {
    return {
      error:
        "Supabase ist nicht konfiguriert. Bitte zuerst .env.local einrichten.",
    };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Bitte E-Mail und Passwort eingeben." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Anmeldung fehlgeschlagen. Bitte Zugangsdaten pruefen." };
  }

  // Layout-Cache invalidieren, damit der neue Auth-Status ueberall greift.
  revalidatePath("/", "layout");
  redirect("/");
}
