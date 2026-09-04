"use client";

import { useState } from "react";
import { LibraryCard, Valuation } from "@/lib/types";
import { valueEmoji } from "@/lib/valueEmoji";
import { isProtectedValuation } from "@/lib/valuationProtection";

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
  canRefresh,
  identifyNotes,
}: {
  valuation: Valuation;
  cardId: string;
  onRefresh: (card: LibraryCard) => void;
  canRefresh: boolean;
  identifyNotes?: string;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [confirmingOverride, setConfirmingOverride] = useState(false);
  const [enteringOverride, setEnteringOverride] = useState(false);
  const [overrideValue, setOverrideValue] = useState("");
  const [overrideSource, setOverrideSource] = useState("");
  const [savingOverride, setSavingOverride] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const protectedValuation = isProtectedValuation(valuation.note);

  async function refresh(force = false) {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/library/${cardId}/refresh-valuation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const data = await res.json();
      if (data.card) {
        onRefresh(data.card);
        setConfirmingOverride(false);
      }
    } finally {
      setRefreshing(false);
    }
  }

  async function saveOverride() {
    const parsed = parseFloat(overrideValue);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setOverrideError("Enter a valid positive value.");
      return;
    }
    setSavingOverride(true);
    setOverrideError(null);
    try {
      const res = await fetch(`/api/library/${cardId}/override-valuation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: parsed, source: overrideSource }),
      });
      const data = await res.json();
      if (data.card) {
        onRefresh(data.card);
        setEnteringOverride(false);
        setOverrideValue("");
        setOverrideSource("");
      } else {
        setOverrideError(data.error ?? "Couldn't save that value.");
      }
    } finally {
      setSavingOverride(false);
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
          {canRefresh && (protectedValuation ? (
            confirmingOverride ? (
              <div className="flex items-center gap-2 text-xs whitespace-nowrap">
                <span className="text-background/70">Replace with a fresh estimate?</span>
                <button
                  onClick={() => setConfirmingOverride(false)}
                  disabled={refreshing}
                  className="text-background/70 hover:text-background transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  onClick={() => refresh(true)}
                  disabled={refreshing}
                  className="text-background font-medium hover:opacity-80 transition-opacity disabled:opacity-40"
                >
                  {refreshing ? "Replacing…" : "Replace"}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingOverride(true)}
                className="text-xs text-background/70 hover:text-background transition-colors whitespace-nowrap"
                title="This price came from a real sale you verified — click to replace it with a fresh automatic estimate instead"
              >
                ✓ Verified by you
              </button>
            )
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEnteringOverride((v) => !v)}
                className="text-xs text-background/70 hover:text-background transition-colors whitespace-nowrap"
                title="Found a real sold comp (e.g. PSA's Auction Prices Realized)? Enter it here to replace the automatic estimate."
              >
                ✏️ Enter verified price
              </button>
              <button
                onClick={() => refresh()}
                disabled={refreshing}
                className="text-xs text-background/70 hover:text-background transition-colors disabled:opacity-40 whitespace-nowrap"
              >
                {refreshing ? "Refreshing…" : "🔄 Refresh"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {enteringOverride && !protectedValuation && (
        <div className="border-t border-white/10 pt-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-background/70">$</span>
            <input
              type="number"
              min="0"
              step="1"
              value={overrideValue}
              onChange={(e) => setOverrideValue(e.target.value)}
              placeholder="Verified sold price"
              className="w-32 rounded-md bg-white/10 px-2 py-1 text-sm text-background placeholder:text-background/40 outline-none focus:ring-1 focus:ring-white/30"
            />
          </div>
          <input
            type="text"
            value={overrideSource}
            onChange={(e) => setOverrideSource(e.target.value)}
            placeholder="Source (optional) — e.g. PSA Auction Prices Realized, 09/03/26"
            className="w-full rounded-md bg-white/10 px-2 py-1 text-sm text-background placeholder:text-background/40 outline-none focus:ring-1 focus:ring-white/30"
          />
          {overrideError && <p className="text-xs text-red-300">{overrideError}</p>}
          <div className="flex items-center gap-3">
            <button
              onClick={saveOverride}
              disabled={savingOverride}
              className="text-xs font-medium text-background hover:opacity-80 transition-opacity disabled:opacity-40"
            >
              {savingOverride ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => {
                setEnteringOverride(false);
                setOverrideError(null);
              }}
              disabled={savingOverride}
              className="text-xs text-background/70 hover:text-background transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 text-sm text-background">
        <span>
          {valuation.low === valuation.high
            ? `Verified: ${formatUsd(valuation.low)}`
            : `Range: ${formatUsd(valuation.low)} – ${formatUsd(valuation.high)}`}
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

      {identifyNotes && (
        <div className="border-t border-white/10 pt-3">
          <p className="text-xs uppercase tracking-wide text-background mb-1">Identification Notes</p>
          <p className="text-sm text-background/90 leading-relaxed">{identifyNotes}</p>
        </div>
      )}
    </div>
  );
}
