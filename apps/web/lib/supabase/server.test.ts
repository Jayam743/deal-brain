import { afterEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const createServerClientMock = vi.fn(() => ({
  auth: { getUser: getUserMock },
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: createServerClientMock,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [],
    set: () => {},
  })),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("getCurrentUser / getCurrentUserId (demo-vs-authed branch)", () => {
  it("demo mode: returns null user and the fixture demo id with no env vars set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    const { getCurrentUser, getCurrentUserId, DEMO_USER_ID } = await import("./server");

    await expect(getCurrentUser()).resolves.toBeNull();
    await expect(getCurrentUserId()).resolves.toBe(DEMO_USER_ID);
    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  it("configured + signed in: returns the real Supabase user and its id", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    getUserMock.mockResolvedValue({ data: { user: { id: "real-user-42" } } });

    const { getCurrentUser, getCurrentUserId } = await import("./server");

    const user = await getCurrentUser();
    expect(user).toEqual({ id: "real-user-42" });
    await expect(getCurrentUserId()).resolves.toBe("real-user-42");
    expect(createServerClientMock).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "anon-key",
      expect.anything(),
    );
  });

  it("configured but signed out: falls back to the fixture demo id", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    getUserMock.mockResolvedValue({ data: { user: null } });

    const { getCurrentUser, getCurrentUserId, DEMO_USER_ID } = await import("./server");

    await expect(getCurrentUser()).resolves.toBeNull();
    await expect(getCurrentUserId()).resolves.toBe(DEMO_USER_ID);
  });
});
