"use client";

import type { DealFeedItem, StoreRetailer } from "@coupon-app/shared";
import { useMemo, useState } from "react";
import { SOURCE_LABEL } from "@/lib/deal-source";
import { DealCard } from "./deal-card";
import { SearchBar } from "./search-bar";
import { StaggerIn } from "./stagger-in";

export function DealsExplorer({
  deals,
  stores,
}: {
  deals: DealFeedItem[];
  stores: StoreRetailer[];
}) {
  const [query, setQuery] = useState("");

  const storeBySlug = useMemo(() => {
    const map = new Map<string, StoreRetailer>();
    stores.forEach((store) => map.set(store.slug, store));
    return map;
  }, [stores]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return deals;
    return deals.filter((deal) => {
      const store = deal.storeSlug ? storeBySlug.get(deal.storeSlug) : undefined;
      const haystack = [deal.title, SOURCE_LABEL[deal.source], store?.name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [deals, query, storeBySlug]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBar
          value={query}
          onChange={setQuery}
          label="Search deals by title, store, or source"
          placeholder="Search deals — title, store, source…"
        />
        <span className="text-xs text-[color:var(--color-text-muted)]">
          {filtered.length} of {deals.length} deals
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="surface-card px-6 py-10 text-center text-sm text-[color:var(--color-text-muted)]">
          No deals match &ldquo;{query}&rdquo;.{" "}
          <button
            type="button"
            onClick={() => setQuery("")}
            className="font-medium text-[color:var(--color-accent)]"
          >
            Clear search
          </button>
        </div>
      ) : (
        <StaggerIn
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
          key={query}
          y={10}
          stagger={0.03}
        >
          {filtered.map((deal) => (
            <DealCard key={deal.id} deal={deal} store={storeBySlug.get(deal.storeSlug ?? "")} />
          ))}
        </StaggerIn>
      )}
    </div>
  );
}
