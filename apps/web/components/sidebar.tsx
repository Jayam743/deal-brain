"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/supabase/actions";
import { BookmarkIcon, FeedIcon, LedgerIcon, SlidersIcon } from "./nav-icons";
import { SampleDataBadge } from "./sample-data-badge";
import { ThemeToggle } from "./theme-toggle";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LedgerIcon },
  { href: "/wishlist", label: "Wishlist", icon: BookmarkIcon },
  { href: "/deals", label: "Deals", icon: FeedIcon },
  { href: "/settings", label: "Settings", icon: SlidersIcon },
];

export function Sidebar({
  configured,
  userEmail,
}: {
  configured: boolean;
  userEmail: string | null;
}) {
  const pathname = usePathname();
  const displayName = configured && userEmail ? userEmail : "Jayam";
  const avatarInitial = displayName[0]?.toUpperCase() ?? "J";

  return (
    <aside
      className="hidden w-60 shrink-0 flex-col justify-between px-5 py-8 md:sticky md:top-0 md:flex md:h-screen"
      style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-xs)" }}
    >
      <div>
        <div className="mb-9 flex items-center gap-2.5 px-1">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg text-sm font-semibold"
            style={{
              background: "var(--color-accent)",
              color: "var(--color-surface)",
              boxShadow: "0 0 0 3px var(--color-accent-soft)",
            }}
          >
            D
          </span>
          <span className="font-display text-[15px] font-semibold tracking-tight">Deal Brain</span>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname?.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors"
                style={{
                  background: active ? "var(--color-accent-soft)" : "transparent",
                  color: active ? "var(--color-accent)" : "var(--color-text-muted)",
                  fontWeight: active ? 600 : 500,
                }}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div
        className="flex flex-col gap-3 border-t px-1 pt-4"
        style={{ borderColor: "var(--color-border)" }}
      >
        <SampleDataBadge />
        {configured ? (
          userEmail ? (
            <form action={signOut} className="flex items-center justify-between gap-2">
              <span
                className="truncate text-xs text-[color:var(--color-text-muted)]"
                title={userEmail}
              >
                {userEmail}
              </span>
              <button
                type="submit"
                className="shrink-0 text-xs font-medium text-[color:var(--color-accent)]"
              >
                Sign out
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="text-xs font-medium text-[color:var(--color-accent)]"
            >
              Sign in
            </Link>
          )
        ) : null}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
              style={{ background: "var(--color-surface-raised)", color: "var(--color-text-muted)" }}
            >
              {avatarInitial}
            </span>
            <span className="truncate text-sm text-[color:var(--color-text-muted)]">
              {displayName}
            </span>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}

/** Bottom tab bar — the sidebar's mobile equivalent below the `md` breakpoint. */
export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex flex-col border-t md:hidden"
      style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", boxShadow: "var(--shadow-xs)" }}
    >
      <div
        className="flex justify-center border-b py-1"
        style={{ borderColor: "var(--color-border)" }}
      >
        <SampleDataBadge />
      </div>
      <div className="flex items-stretch justify-around px-2 py-1.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname?.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] transition-colors"
              style={{
                color: active ? "var(--color-accent)" : "var(--color-text-muted)",
                fontWeight: active ? 600 : 500,
              }}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
