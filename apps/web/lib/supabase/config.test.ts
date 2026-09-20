import { afterEach, describe, expect, it, vi } from "vitest";
import { getSupabaseEnv, isSupabaseConfigured } from "./config";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isSupabaseConfigured", () => {
  it("is false with neither url nor key", () => {
    expect(isSupabaseConfigured(undefined, undefined)).toBe(false);
  });

  it("is false with only the url set", () => {
    expect(isSupabaseConfigured("https://example.supabase.co", undefined)).toBe(false);
  });

  it("is false with only the anon key set", () => {
    expect(isSupabaseConfigured(undefined, "anon-key")).toBe(false);
  });

  it("is false when both are empty strings", () => {
    expect(isSupabaseConfigured("", "")).toBe(false);
  });

  it("is true when both url and anon key are set", () => {
    expect(isSupabaseConfigured("https://example.supabase.co", "anon-key")).toBe(true);
  });

  it("falls back to reading process.env when called with no args", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    expect(isSupabaseConfigured()).toBe(false);

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    expect(isSupabaseConfigured()).toBe(true);
  });
});

describe("getSupabaseEnv", () => {
  it("throws when Supabase env vars are missing (demo mode)", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    expect(() => getSupabaseEnv()).toThrow(/isSupabaseConfigured/);
  });

  it("throws when only the url is present", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    expect(() => getSupabaseEnv()).toThrow();
  });

  it("returns the url and anon key when both are present", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    expect(getSupabaseEnv()).toEqual({
      url: "https://example.supabase.co",
      anonKey: "anon-key",
    });
  });
});
