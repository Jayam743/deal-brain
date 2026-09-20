"use client";

import { CloseIcon, SearchIcon } from "./nav-icons";

export function SearchBar({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <div className="relative w-full max-w-sm">
      <label htmlFor="global-search" className="sr-only">
        {label}
      </label>
      <SearchIcon
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
        aria-hidden="true"
      />
      <input
        id="global-search"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-full border bg-[color:var(--color-surface)] py-2 pl-9 pr-9 text-sm outline-none transition-shadow placeholder:text-[color:var(--color-text-muted)] focus-visible:shadow-[0_0_0_3px_var(--color-accent)]"
        style={{ borderColor: "var(--color-border)" }}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-[color:var(--color-text-muted)] transition-colors hover:text-[color:var(--color-text)]"
        >
          <CloseIcon className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
