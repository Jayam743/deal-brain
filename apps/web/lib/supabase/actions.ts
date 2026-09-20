"use server";

import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "./config";
import { createClient } from "./server";

/** Sign-out server action, used by the sidebar. No-op in demo mode. */
export async function signOut() {
  if (!isSupabaseConfigured()) {
    return;
  }
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
