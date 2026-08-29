"use client";

import { useState } from "react";
import { LibraryCard, Valuation } from "@/lib/types";
import { valueEmoji } from "@/lib/valueEmoji";

function formatUsd(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

// "Low" covers a few different situations (a pure sport/age/grade formula
// guess, 1-2 real eBay listings, or now a handful of manually-verified real
// sold comps) — the note text below always spells out which one it actually
// is, so the badge itself stays generic rather than guessing "modeled" when
// it might really be backed by real sold data.
const confidenceLabel: Record<Valuation["confidence"], string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};

// The dark green/red tokens used elsewhere (text-accent, text-up, text-down)
// are tuned for contrast against a white surface — on this card's black
// background they drop to ~4.2:1, below the readable threshold. This card
// uses brighter, dark-surface-only variants instead.
const confidenceColor: Record<Valuation["confidence"], string> = {
  high: "bg-white/10 text-[#4ade80]",
  medium: "bg-white/10 text-[#4ade80]",
  low: "bg-white/10 text-background",
};

export function ValuationCard({
  valuation,
  cardId,
  onRefresh,
}: {
  valuation: Valuation;
  cardId: string;
  onRefresh: (card: LibraryCard) => void;
}) {
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/library/${cardId}/refresh-valuation`, { method: "POST" });
      const data = await res.json();
      if (data.card) onRefresh(data.card);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="rounded-xl bg-foreground text-background p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-background mb-1">Estimated Value</p>
          <p className="text-5xl font-bold tracking-tight text-[#4ade80]">{formatUsd(valuation.estimate)}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${confidenceColor[valuation.confidence]}`}>
            {confidenceLabel[valuation.confidence]}
          </span>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="text-xs text-background/70 hover:text-background transition-colors disabled:opacity-40 whitespace-nowrap"
          >
            {refreshing ? "Refreshing…" : "🔄 Refresh"}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-background">
        <span>
          Range: {formatUsd(valuation.low)} – {formatUsd(valuation.high)}
        </span>
        <span className="text-lg" title={`Estimated at ${formatUsd(valuation.estimate)}`}>
          {valueEmoji(valuation.estimate)}
        </span>
      </div>

      {valuation.matchedComp && (
        <p className="text-sm text-background/90 border-t border-white/10 pt-3">
          Matched comp: <span className="text-background">{valuation.matchedComp}</span>
        </p>
      )}
      <p className="text-sm text-background/90 leading-relaxed">{valuation.note}</p>
    </div>
  );
}
