// Demo-mode gate (R-30): the app must stay fully browsable on fixtures with
// zero Supabase env vars set — no login wall, no redirect. Auth only turns on
// once both public env vars are present. Mirrors the isBestBuyConfigured
// pattern in services/adapters/src/bestbuy.ts (args default from process.env,
// overridable for tests).
export function isSupabaseConfigured(
  url: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
): boolean {
  return Boolean(url) && Boolean(anonKey);
}

export function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Supabase env vars are missing — call isSupabaseConfigured() before reaching for a client.",
    );
  }
  return { url, anonKey };
}
