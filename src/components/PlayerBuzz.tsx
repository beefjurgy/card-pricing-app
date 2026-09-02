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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function PlayerBuzz({ identity }: { identity: CardIdentity }) {
  const [items, setItems] = useState<BuzzItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    fetch("/api/trending", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player: identity.player, sport: identity.sport }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setItems(data.items ?? []);
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
