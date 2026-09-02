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

interface EspnBuzzScore {
  label: "Trending" | "Active" | "Quiet";
  emoji: string;
  mentions7d: number;
  mentions30d: number;
}

const BUZZ_STYLE: Record<EspnBuzzScore["label"], string> = {
  Trending: "bg-down/10 text-down",
  Active: "bg-up/10 text-up",
  Quiet: "bg-surface-2 text-muted",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function PlayerBuzz({ identity }: { identity: CardIdentity }) {
  const [items, setItems] = useState<BuzzItem[] | null>(null);
  const [espnBuzz, setEspnBuzz] = useState<EspnBuzzScore | null>(null);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setEspnBuzz(null);
    fetch("/api/trending", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player: identity.player, sport: identity.sport }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setItems(data.items ?? []);
          setEspnBuzz(data.espnBuzz ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [identity.player, identity.sport]);

  if (items && items.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between mb-3">
        <SectionHeading>In the News</SectionHeading>
        {espnBuzz && (
          <span
            title={`${espnBuzz.mentions7d} ESPN mention${espnBuzz.mentions7d === 1 ? "" : "s"} in the last 7 days, ${espnBuzz.mentions30d} in the last 30`}
            className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${BUZZ_STYLE[espnBuzz.label]}`}
          >
            {espnBuzz.emoji} {espnBuzz.label}
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
