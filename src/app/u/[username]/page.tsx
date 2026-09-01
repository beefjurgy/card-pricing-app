"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { LibraryCard } from "@/lib/types";
import { CardTile } from "@/components/CardTile";

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

  if (notFound) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 text-center text-muted">
        No collection found for @{username}.
      </div>
    );
  }

  const totalValue = cards?.reduce((sum, c) => sum + c.valuation.estimate, 0) ?? 0;

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
                {cards.length > 0 && (
                  <>
                    {" "}
                    · Est. total value{" "}
                    <span className="text-accent font-medium">
                      {totalValue.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
                    </span>
                  </>
                )}
              </>
            )}
          </p>
        </div>
      </div>

      {!cards ? (
        <div className="text-muted py-16 text-center">Loading…</div>
      ) : cards.length === 0 ? (
        <div className="text-muted py-16 text-center">No cards yet.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <CardTile key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}
