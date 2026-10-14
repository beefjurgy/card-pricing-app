"use client";

import { useEffect, useState } from "react";

// A small, fixed "top 3" — separate from the isFeatured star (which has no
// cap and no ordering). Clicking the slot this card already occupies clears
// it; clicking any other slot assigns this card there, bumping whatever was
// in it before.
export function FavoriteSlotsPicker({ cardId }: { cardId: string }) {
  const [favorites, setFavorites] = useState<(string | null)[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/account/favorites")
      .then((r) => r.json())
      .then((data: { favorites?: (string | null)[] }) => {
        if (!cancelled) setFavorites(data.favorites ?? [null, null, null]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function setSlot(slot: 1 | 2 | 3) {
    if (busy || !favorites) return;
    const alreadyThisSlot = favorites[slot - 1] === cardId;
    setBusy(true);
    try {
      const res = await fetch("/api/account/favorites", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot, cardId: alreadyThisSlot ? null : cardId }),
      });
      const data = await res.json();
      if (data.favorites) setFavorites(data.favorites);
    } finally {
      setBusy(false);
    }
  }

  if (!favorites) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted">Top 3:</span>
      {([1, 2, 3] as const).map((slot) => {
        const occupiedByThis = favorites[slot - 1] === cardId;
        return (
          <button
            key={slot}
            onClick={() => setSlot(slot)}
            disabled={busy}
            title={occupiedByThis ? `Remove from Top 3, slot ${slot}` : `Set as favorite #${slot}`}
            className={`w-7 h-7 rounded-full border text-xs font-medium transition-colors disabled:opacity-50 ${
              occupiedByThis
                ? "bg-brand text-white border-brand"
                : "bg-surface-2 text-muted border-border hover:text-foreground"
            }`}
          >
            {slot}
          </button>
        );
      })}
    </div>
  );
}
