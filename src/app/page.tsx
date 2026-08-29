"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LibraryCard } from "@/lib/types";
import { CardTile } from "@/components/CardTile";
import { SORT_LABELS, SortOption, sortCards } from "@/lib/librarySort";

export default function LibraryPage() {
  const [cards, setCards] = useState<LibraryCard[] | null>(null);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  useEffect(() => {
    fetch("/api/library")
      .then((r) => {
        if (!r.ok) throw new Error(`Request failed: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setCards(data.cards);
        setError(false);
      })
      .catch(() => setError(true));
  }, [reloadKey]);

  const totalValue = cards?.reduce((sum, c) => sum + c.valuation.estimate, 0) ?? 0;
  const sortedCards = useMemo(() => (cards ? sortCards(cards, sortBy) : []), [cards, sortBy]);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Nukes</h1>
          <p className="text-muted text-sm mt-1">
            {cards ? `${cards.length} card${cards.length === 1 ? "" : "s"}` : "Loading…"}
            {cards && cards.length > 0 && (
              <>
                {" "}
                · Est. total value{" "}
                <span className="text-accent font-medium">
                  {totalValue.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {cards && cards.length > 1 && (
            <label className="flex items-center gap-2 text-sm text-muted">
              Sort by
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-2.5 py-1.5 rounded-md bg-surface-2 border border-border text-foreground focus:border-accent-2 outline-none"
              >
                {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                  <option key={key} value={key}>
                    {SORT_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
          )}
          <Link
            href="/scan"
            className="px-4 py-2 rounded-md bg-brand text-white font-medium hover:opacity-90 transition-opacity text-sm"
          >
            + Add New Card
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-down/40 bg-down/10 p-12 text-center">
          <p className="text-4xl mb-3">⚠️</p>
          <p className="text-lg font-medium mb-1">Couldn&apos;t load your nukes</p>
          <p className="text-muted text-sm mb-5">There was a problem reaching the server. Your cards are still safe.</p>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="px-4 py-2 rounded-md bg-down/90 text-white font-medium hover:bg-down transition-colors text-sm"
          >
            Try Again
          </button>
        </div>
      )}

      {!error && cards && cards.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
          <p className="text-4xl mb-3">🃏</p>
          <p className="text-lg font-medium mb-1">Your nukes are empty</p>
          <p className="text-muted text-sm mb-5">Scan your first card to get a value estimate and recent sales.</p>
          <Link
            href="/scan"
            className="inline-block px-4 py-2 rounded-md bg-brand text-white font-medium hover:opacity-90 transition-opacity text-sm"
          >
            Add a Card
          </Link>
        </div>
      )}

      {cards && cards.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {sortedCards.map((card) => (
            <CardTile key={card.id} card={card} sortBy={sortBy} />
          ))}
        </div>
      )}
    </div>
  );
}
