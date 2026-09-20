"use client";

import type { WishlistWithVerdict } from "@coupon-app/shared";
import { useMemo, useState } from "react";
import { SearchBar } from "./search-bar";
import { StaggerIn } from "./stagger-in";
import { WishlistCard } from "./wishlist-card";

export function WishlistExplorer({
  items,
  historyByProduct,
}: {
  items: WishlistWithVerdict[];
  historyByProduct: Record<string, number[]>;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const haystack = [item.product.title, item.product.brand, item.product.category]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBar
          value={query}
          onChange={setQuery}
          label="Search your wishlist by title, brand, or category"
          placeholder="Search your wishlist…"
        />
        <span className="text-xs text-[color:var(--color-text-muted)]">
          {filtered.length} of {items.length} tracked
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="surface-card px-6 py-10 text-center text-sm text-[color:var(--color-text-muted)]">
          No tracked items match &ldquo;{query}&rdquo;.{" "}
          <button
            type="button"
            onClick={() => setQuery("")}
            className="font-medium text-[color:var(--color-accent)]"
          >
            Clear search
          </button>
        </div>
      ) : (
        <StaggerIn className="flex flex-col gap-3" key={query} y={10} stagger={0.05}>
          {filtered.map((item) => (
            <WishlistCard
              key={item.id}
              item={item}
              history={historyByProduct[item.productId] ?? []}
            />
          ))}
        </StaggerIn>
      )}
    </div>
  );
}
