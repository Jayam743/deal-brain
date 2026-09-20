"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv, isSupabaseConfigured } from "./config";

/**
 * Browser Supabase client. Only call this when `isSupabaseConfigured()` is
 * true — demo mode (no env vars) must never construct a client.
 */
export function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("createClient() called while Supabase is not configured (demo mode).");
  }
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
