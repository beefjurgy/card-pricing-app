"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LibraryCard } from "@/lib/types";
import { CardTile } from "@/components/CardTile";
import { isSortOption, SORT_LABELS, SortOption, sortCards } from "@/lib/librarySort";

// There's no dedicated structured field for "this is a memorabilia/relic
// card" (unlike isAutograph), so this checks the same free-text fields the
// identify step already fills in — parallel and set name reliably mention
// "Relic"/"Patch"/"Jersey"/"Memorabilia"/"Swatch" for these cards, the same
// way a title reliably mentions "auto" elsewhere in this app.
const PATCH_KEYWORDS = ["relic", "patch", "jersey", "memorabilia", "swatch"];
function isPatchCard(card: LibraryCard): boolean {
  const text = `${card.parallel} ${card.setName}`.toLowerCase();
  return PATCH_KEYWORDS.some((kw) => text.includes(kw));
}

// A serial-numbered parallel prints its own run directly on the card
// ("086/150"), and that run reliably ends up in the stored parallel field
// (e.g. "Purple /150") — same signal valuation.ts's extractPrintRun reads.
function isNumberedCard(card: LibraryCard): boolean {
  return /\/\d{1,4}\b/.test(card.parallel);
}

export default function LibraryPage() {
  return (
    <Suspense>
      <LibraryPageInner />
    </Suspense>
  );
}

function LibraryPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [cards, setCards] = useState<LibraryCard[] | null>(null);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Filter/sort state is mirrored into the URL (see the effect below) so
  // that navigating away and back — via the card page's "← Nukes" button,
  // or a plain browser back — restores the exact same filtered/sorted view
  // instead of resetting to the unfiltered library. Read once on mount as
  // the initial value; genuinely new navigations to "/" with no params
  // still land on a clean, unfiltered "All" view.
  const initialSort = searchParams.get("sort");
  const [sortBy, setSortBy] = useState<SortOption>(isSortOption(initialSort) ? initialSort : "recent");
  const [sportFilter, setSportFilter] = useState<string | null>(searchParams.get("sport"));
  const [gradedOnly, setGradedOnly] = useState(searchParams.get("graded") === "1");
  const [autoOnly, setAutoOnly] = useState(searchParams.get("auto") === "1");
  const [patchOnly, setPatchOnly] = useState(searchParams.get("patch") === "1");
  const [numberedOnly, setNumberedOnly] = useState(searchParams.get("numbered") === "1");

  useEffect(() => {
    const params = new URLSearchParams();
    if (sortBy !== "recent") params.set("sort", sortBy);
    if (sportFilter) params.set("sport", sportFilter);
    if (gradedOnly) params.set("graded", "1");
    if (autoOnly) params.set("auto", "1");
    if (patchOnly) params.set("patch", "1");
    if (numberedOnly) params.set("numbered", "1");
    const query = params.toString();
    router.replace(query ? `/?${query}` : "/", { scroll: false });
  }, [sortBy, sportFilter, gradedOnly, autoOnly, patchOnly, numberedOnly, router]);

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

  // Built from whatever sports are actually present rather than a fixed list
  // — automatically includes every sport the user has scanned, in whatever
  // combination, without needing a code change each time a new one shows up.
  const sportCounts = useMemo(() => {
    if (!cards) return [];
    const counts = new Map<string, number>();
    for (const c of cards) counts.set(c.sport, (counts.get(c.sport) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [cards]);

  // Sport narrows first, then Graded/Auto layer on top of that — the pill
  // counts for those two reflect the sport-filtered set so they stay
  // meaningful whichever sport tab is active.
  const sportFilteredCards = useMemo(() => {
    if (!cards) return [];
    return sportFilter ? cards.filter((c) => c.sport === sportFilter) : cards;
  }, [cards, sportFilter]);

  const gradedCount = sportFilteredCards.filter((c) => c.gradingCompany && c.grade).length;
  const autoCount = sportFilteredCards.filter((c) => c.isAutograph).length;
  const patchCount = sportFilteredCards.filter(isPatchCard).length;
  const numberedCount = sportFilteredCards.filter(isNumberedCard).length;

  const filteredCards = useMemo(() => {
    return sportFilteredCards.filter((c) => {
      if (gradedOnly && !(c.gradingCompany && c.grade)) return false;
      if (autoOnly && !c.isAutograph) return false;
      if (patchOnly && !isPatchCard(c)) return false;
      if (numberedOnly && !isNumberedCard(c)) return false;
      return true;
    });
  }, [sportFilteredCards, gradedOnly, autoOnly, patchOnly, numberedOnly]);

  const totalValue = filteredCards.reduce((sum, c) => sum + c.valuation.estimate, 0);
  const sortedCards = useMemo(() => sortCards(filteredCards, sortBy), [filteredCards, sortBy]);

  // Only cards with a recorded purchase price count toward the overall
  // gain/loss — mixing in cards with no known cost basis would make the
  // percentage meaningless, same reasoning as the per-card figure.
  const costBasisCards = filteredCards.filter((c): c is LibraryCard & { purchasePrice: number } => typeof c.purchasePrice === "number");
  const totalPaid = costBasisCards.reduce((sum, c) => sum + c.purchasePrice, 0);
  const totalPaidValue = costBasisCards.reduce((sum, c) => sum + c.valuation.estimate, 0);
  const overallDiff = totalPaidValue - totalPaid;
  const overallPositive = overallDiff >= 0;
  const overallPct = totalPaid > 0 ? Math.round((overallDiff / totalPaid) * 1000) / 10 : null;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <div className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">My Collection</h1>
        <p className="text-muted text-sm mt-1">
          {cards ? `${filteredCards.length} card${filteredCards.length === 1 ? "" : "s"}` : "Loading…"}
          {cards && filteredCards.length > 0 && (
            <>
              {" "}
              · Est. total value{" "}
              <Link href="/portfolio" className="hover:underline">
                <span className="text-accent font-medium">
                  {totalValue.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
                </span>
              </Link>
              {overallPct !== null && (
                <>
                  {" "}
                  ·{" "}
                  <Link href="/portfolio" className="hover:underline">
                    <span className={`font-medium ${overallPositive ? "text-up" : "text-down"}`}>
                      {overallPositive ? "+" : ""}
                      {overallDiff.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} (
                      {overallPositive ? "+" : ""}
                      {overallPct}%)
                    </span>
                  </Link>
                </>
              )}
            </>
          )}
        </p>
      </div>

      {cards && cards.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            onClick={() => setSportFilter(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              sportFilter === null ? "bg-brand text-white" : "bg-surface-2 text-muted hover:text-foreground"
            }`}
          >
            All ({cards.length})
          </button>
          {sportCounts.map(([sport, count]) => (
            <button
              key={sport}
              onClick={() => setSportFilter(sport)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                sportFilter === sport ? "bg-brand text-white" : "bg-surface-2 text-muted hover:text-foreground"
              }`}
            >
              {sport} ({count})
            </button>
          ))}

          <span className="w-px self-stretch bg-border mx-1" />

          <button
            onClick={() => setGradedOnly((v) => !v)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              gradedOnly ? "bg-brand text-white" : "bg-surface-2 text-muted hover:text-foreground"
            }`}
          >
            Graded ({gradedCount})
          </button>
          <button
            onClick={() => setAutoOnly((v) => !v)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              autoOnly ? "bg-brand text-white" : "bg-surface-2 text-muted hover:text-foreground"
            }`}
          >
            ✍️ Auto ({autoCount})
          </button>
          <button
            onClick={() => setPatchOnly((v) => !v)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              patchOnly ? "bg-brand text-white" : "bg-surface-2 text-muted hover:text-foreground"
            }`}
          >
            🧵 Patch ({patchCount})
          </button>
          <button
            onClick={() => setNumberedOnly((v) => !v)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              numberedOnly ? "bg-brand text-white" : "bg-surface-2 text-muted hover:text-foreground"
            }`}
          >
            🔢 Numbered ({numberedCount})
          </button>
        </div>
      )}

      {cards && cards.length > 1 && (
        <div className="flex justify-end mb-8">
          <label className="flex items-center gap-2 text-sm text-muted whitespace-nowrap">
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
        </div>
      )}

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
