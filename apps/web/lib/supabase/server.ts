import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv, isSupabaseConfigured } from "./config";

/**
 * Server Supabase client (Server Components, Route Handlers, Server Actions).
 * Only call this when `isSupabaseConfigured()` is true — demo mode must never
 * construct a client or touch cookies for a session that doesn't exist.
 */
export async function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("createClient() called while Supabase is not configured (demo mode).");
  }
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — the middleware refreshes the
          // session on the next request, so this is safe to swallow.
        }
      },
    },
  });
}

/**
 * The signed-in Supabase user, or `null` in demo mode / when signed out.
 * Demo-safe: never redirects, never throws when unconfigured.
 */
export async function getCurrentUser() {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** The fixture identity used everywhere in demo mode (matches packages/shared/src/fixtures.ts). */
export const DEMO_USER_ID = "user-jayam";

/**
 * Resolves the id user-scoped reads should key on: the real Supabase user id
 * when authed, otherwise the fixture demo id — so demo mode keeps rendering
 * the existing fixture wishlist unchanged.
 */
export async function getCurrentUserId(): Promise<string> {
  const user = await getCurrentUser();
  return user?.id ?? DEMO_USER_ID;
}
