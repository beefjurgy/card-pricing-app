"use client";

import { useEffect, useState } from "react";
import { CardIdentity } from "@/lib/types";
import { SectionHeading } from "./SectionHeading";

interface BuzzItem {
  source: "ESPN";
  headline: string;
  url: string;
  publishedDate: string | null;
}

export interface HeatScore {
  label: "High Buzz" | "Rising Buzz" | "Low Buzz";
  emoji: string;
  mentions7d: number;
  mentions30d: number;
  listingCount: number | null;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function PlayerBuzz({
  identity,
  listingCount,
  onHeatChange,
}: {
  identity: CardIdentity;
  listingCount: number | null;
  // The heat badge itself now renders up by the player's name (see
  // CardIdentityEditor) — this still owns the fetch (it already needs the
  // same data for the headline list) and just reports the score upward.
  onHeatChange?: (heat: HeatScore | null) => void;
}) {
  const [items, setItems] = useState<BuzzItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    onHeatChange?.(null);
    fetch("/api/trending", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player: identity.player, sport: identity.sport, listingCount: null }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setItems(data.items ?? []);
          onHeatChange?.(data.heat ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity.player, identity.sport]);

  // The eBay listing count arrives slightly later, from the sibling
  // EbayListings component's own fetch (avoids a duplicate eBay search) —
  // once it does, refresh just the heat score. Cheap: the server caches
  // ESPN results separately from the score, so this doesn't re-hit the
  // API or reset the visible headline list back to "Loading…".
  useEffect(() => {
    if (listingCount === null) return;
    fetch("/api/trending", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player: identity.player, sport: identity.sport, listingCount }),
    })
      .then((r) => r.json())
      .then((data) => onHeatChange?.(data.heat ?? null))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingCount]);

  if (items && items.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <SectionHeading className="mb-3">In the News</SectionHeading>
      {!items ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <a
              key={item.url}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg hover:bg-surface-2 transition-colors p-2 -m-2"
            >
              <p className="text-sm">{item.headline}</p>
              <p className="text-xs text-muted mt-0.5">
                {item.source}
                {item.publishedDate && ` · ${formatDate(item.publishedDate)}`}
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
