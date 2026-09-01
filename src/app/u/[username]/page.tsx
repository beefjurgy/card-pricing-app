"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { LibraryCard } from "@/lib/types";
import { CardTile } from "@/components/CardTile";
import { SORT_LABELS, SortOption, sortCards } from "@/lib/librarySort";

interface ProfileUser {
  name: string | null;
  image: string | null;
  username: string;
}

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [cards, setCards] = useState<LibraryCard[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("recent");

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

  const sortedCards = useMemo(() => (cards ? sortCards(cards, sortBy) : null), [cards, sortBy]);

  if (notFound) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 text-center text-muted">
        No collection found for @{username}.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <div className="mb-4 flex items-center gap-3">
        {user?.image && (
          <Image src={user.image} alt="" width={48} height={48} className="rounded-full" unoptimized />
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{user?.name ?? `@${username}`}</h1>
          <p className="text-muted text-sm">
            @{username}
            {cards && (
              <>
                {" "}
                · {cards.length} card{cards.length === 1 ? "" : "s"}
              </>
            )}
          </p>
        </div>
      </div>

      {sortedCards && sortedCards.length > 1 && (
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

      {!sortedCards ? (
        <div className="text-muted py-16 text-center">Loading…</div>
      ) : sortedCards.length === 0 ? (
        <div className="text-muted py-16 text-center">No cards yet.</div>
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
