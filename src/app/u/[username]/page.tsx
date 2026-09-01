"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { LibraryCard } from "@/lib/types";
import { CardTile } from "@/components/CardTile";
import { SORT_LABELS, SortOption, sortCards } from "@/lib/librarySort";
import { isNumberedCard, isPatchCard } from "@/lib/cardFilters";

interface ProfileUser {
  avatarUrl: string | null;
  username: string;
}

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [cards, setCards] = useState<LibraryCard[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("value-high");
  const [sportFilter, setSportFilter] = useState<string | null>(null);
  const [gradedOnly, setGradedOnly] = useState(false);
  const [autoOnly, setAutoOnly] = useState(false);
  const [patchOnly, setPatchOnly] = useState(false);
  const [numberedOnly, setNumberedOnly] = useState(false);
  const [featuredOnly, setFeaturedOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setUser(null);
    setCards(null);
    setNotFound(false);
    fetch(`/api/users/${username}`)
      .then(async (res) => {
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setUser(data.user);
        setCards(data.cards);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      });
    return () => {
      cancelled = true;
    };
  }, [username]);

  // Built from whatever sports are actually present rather than a fixed
  // list, same reasoning as the home page's equivalent.
  const sportCounts = useMemo(() => {
    if (!cards) return [];
    const counts = new Map<string, number>();
    for (const c of cards) counts.set(c.sport, (counts.get(c.sport) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [cards]);

  const sportFilteredCards = useMemo(() => {
    if (!cards) return [];
    return sportFilter ? cards.filter((c) => c.sport === sportFilter) : cards;
  }, [cards, sportFilter]);

  const gradedCount = sportFilteredCards.filter((c) => c.gradingCompany && c.grade).length;
  const autoCount = sportFilteredCards.filter((c) => c.isAutograph).length;
  const patchCount = sportFilteredCards.filter(isPatchCard).length;
  const numberedCount = sportFilteredCards.filter(isNumberedCard).length;
  const featuredCount = sportFilteredCards.filter((c) => c.isFeatured).length;

  const filteredCards = useMemo(() => {
    return sportFilteredCards.filter((c) => {
      if (gradedOnly && !(c.gradingCompany && c.grade)) return false;
      if (autoOnly && !c.isAutograph) return false;
      if (patchOnly && !isPatchCard(c)) return false;
      if (numberedOnly && !isNumberedCard(c)) return false;
      if (featuredOnly && !c.isFeatured) return false;
      return true;
    });
  }, [sportFilteredCards, gradedOnly, autoOnly, patchOnly, numberedOnly, featuredOnly]);

  const sortedCards = useMemo(() => sortCards(filteredCards, sortBy), [filteredCards, sortBy]);

  if (notFound) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 text-center text-muted">
        No collection found for @{username}.
      </div>
    );
  }

  const pillClass = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
      active ? "bg-brand text-white" : "bg-surface-2 text-muted hover:text-foreground"
    }`;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <div className="mb-4 flex items-center gap-3">
        {user?.avatarUrl && (
          <Image src={user.avatarUrl} alt="" width={48} height={48} className="w-12 h-12 rounded-full object-cover" unoptimized />
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">@{username}</h1>
          <p className="text-muted text-sm">
            {cards && (
              <>
                {cards.length} card{cards.length === 1 ? "" : "s"}
              </>
            )}
          </p>
        </div>
      </div>

      {cards && cards.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button onClick={() => setSportFilter(null)} className={pillClass(sportFilter === null)}>
            All ({cards.length})
          </button>
          {sportCounts.map(([sport, count]) => (
            <button key={sport} onClick={() => setSportFilter(sport)} className={pillClass(sportFilter === sport)}>
              {sport} ({count})
            </button>
          ))}

          <span className="w-px self-stretch bg-border mx-1" />

          <button
            onClick={() => setFeaturedOnly((v) => !v)}
            title="Cards starred as Featured"
            className={pillClass(featuredOnly)}
          >
            ⭐ Featured ({featuredCount})
          </button>
          <button onClick={() => setGradedOnly((v) => !v)} className={pillClass(gradedOnly)}>
            Slabs ({gradedCount})
          </button>
          <button onClick={() => setAutoOnly((v) => !v)} className={pillClass(autoOnly)}>
            ✍️ Auto ({autoCount})
          </button>
          <button onClick={() => setPatchOnly((v) => !v)} className={pillClass(patchOnly)}>
            🧵 Patch ({patchCount})
          </button>
          <button onClick={() => setNumberedOnly((v) => !v)} className={pillClass(numberedOnly)}>
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

      {!cards ? (
        <div className="text-muted py-16 text-center">Loading…</div>
      ) : cards.length === 0 ? (
        <div className="text-muted py-16 text-center">No cards yet.</div>
      ) : sortedCards.length === 0 ? (
        <div className="text-muted py-16 text-center">No cards match these filters.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {sortedCards.map((card) => (
            <CardTile key={card.id} card={card} sortBy={sortBy} />
          ))}
        </div>
      )}
    </div>
  );
}
