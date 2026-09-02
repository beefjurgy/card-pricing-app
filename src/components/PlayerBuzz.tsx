"use client";

import { useEffect, useState } from "react";
import { CardIdentity } from "@/lib/types";
import { SectionHeading } from "./SectionHeading";

interface BuzzItem {
  source: "ESPN" | "NYT";
  headline: string;
  url: string;
  publishedDate: string | null;
}

interface HeatScore {
  label: "Trending" | "Active" | "Quiet";
  emoji: string;
  mentions7d: number;
  mentions30d: number;
  listingCount: number | null;
}

const HEAT_STYLE: Record<HeatScore["label"], string> = {
  Trending: "bg-down/10 text-down",
  Active: "bg-up/10 text-up",
  Quiet: "bg-surface-2 text-muted",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function PlayerBuzz({ identity, listingCount }: { identity: CardIdentity; listingCount: number | null }) {
  const [items, setItems] = useState<BuzzItem[] | null>(null);
  const [heat, setHeat] = useState<HeatScore | null>(null);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setHeat(null);
    fetch("/api/trending", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player: identity.player, sport: identity.sport, listingCount: null }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setItems(data.items ?? []);
          setHeat(data.heat ?? null);
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
  // ESPN/NYT results separately from the score, so this doesn't re-hit
  // either API or reset the visible headline list back to "Loading…".
  useEffect(() => {
    if (listingCount === null) return;
    fetch("/api/trending", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player: identity.player, sport: identity.sport, listingCount }),
    })
      .then((r) => r.json())
      .then((data) => setHeat(data.heat ?? null))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingCount]);

  if (items && items.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between mb-3">
        <SectionHeading>In the News</SectionHeading>
        {heat && (
          <span
            title={`${heat.mentions7d} ESPN mention${heat.mentions7d === 1 ? "" : "s"} in the last 7 days, ${heat.mentions30d} in the last 30${
              heat.listingCount !== null ? ` · ${heat.listingCount} active eBay listing${heat.listingCount === 1 ? "" : "s"}` : ""
            }`}
            className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${HEAT_STYLE[heat.label]}`}
          >
            {heat.emoji} {heat.label}
          </span>
        )}
      </div>
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
