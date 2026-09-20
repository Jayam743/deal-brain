"use server";

import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getOrigin } from "@/lib/supabase/origin";
import { createClient } from "@/lib/supabase/server";

export type LoginActionState = { error?: string; success?: boolean };

/** Sends an email magic link. Demo-safe: refuses cleanly if unconfigured. */
export async function sendMagicLink(
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  if (!isSupabaseConfigured()) {
    return { error: "Sign-in is disabled in demo mode." };
  }
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Enter an email address." };
  }

  const supabase = await createClient();
  const origin = await getOrigin();
  const next = String(formData.get("next") ?? "/dashboard");
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    return { error: error.message };
  }
  return { success: true };
}

/** Starts the GitHub OAuth flow. Demo-safe: no-op if unconfigured. */
export async function signInWithGitHub(formData: FormData) {
  if (!isSupabaseConfigured()) {
    return;
  }
  const supabase = await createClient();
  const origin = await getOrigin();
  const next = String(formData.get("next") ?? "/dashboard");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    return;
  }
  redirect(data.url);
}
