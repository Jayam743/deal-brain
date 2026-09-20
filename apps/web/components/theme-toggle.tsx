"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "./nav-icons";

const STORAGE_KEY = "deal-brain-theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "dark" || current === "light") setTheme(current);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className="hover-lift inline-flex h-8 w-8 items-center justify-center rounded-full border text-[color:var(--color-text-muted)] transition-colors hover:text-[color:var(--color-text)]"
      style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
    >
      {theme === "dark" ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
    </button>
  );
}
