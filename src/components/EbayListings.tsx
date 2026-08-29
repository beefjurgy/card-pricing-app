"use client";

import { useEffect, useState } from "react";
import { CardIdentity } from "@/lib/types";
import { SectionHeading } from "./SectionHeading";

interface EbayListing {
  itemId: string;
  title: string;
  price: number | null;
  condition: string;
  imageUrl: string | null;
  itemWebUrl: string;
  exactMatch: boolean;
}

interface EbaySearchResult {
  configured: boolean;
  error: string | null;
  environment: "sandbox" | "production";
  listings: EbayListing[];
  hasBroadMatches: boolean;
}

function formatUsd(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function EbayListings({ identity }: { identity: CardIdentity }) {
  const [result, setResult] = useState<EbaySearchResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ebay-listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(identity),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch(() => {
        if (!cancelled) {
          setResult({ configured: true, error: "Could not reach the server.", environment: "sandbox", listings: [], hasBroadMatches: false });
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity.player, identity.year, identity.brand, identity.setName, identity.cardNumber, identity.parallel]);

  if (!result || !result.configured) return null;

  const displayedListings = result.listings.slice(0, 10);

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <SectionHeading>Current eBay Listings</SectionHeading>
        {result.environment === "sandbox" && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent">Sandbox test data</span>
        )}
      </div>

      {result.error && <p className="text-sm text-down">{result.error}</p>}

      {!result.error && result.listings.length === 0 && (
        <p className="text-sm text-muted">No active eBay listings found for this card right now.</p>
      )}

      {!result.error && result.hasBroadMatches && (
        <p className="text-xs text-accent mb-3">
          Sellers describe parallels/variants inconsistently, so listings for other versions of this same base card are
          included below (marked &quot;Other parallel&quot;) alongside exact matches.
        </p>
      )}

      {!result.error && displayedListings.length > 0 && (
        <div className="space-y-3">
          {displayedListings.map((item) => (
            <a
              key={item.itemId}
              href={item.itemWebUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg hover:bg-surface-2 transition-colors p-2 -m-2"
            >
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt="" className="w-12 h-12 rounded object-cover shrink-0 bg-surface-2" />
              ) : (
                <div className="w-12 h-12 rounded bg-surface-2 shrink-0 flex items-center justify-center text-lg">🃏</div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate">{item.title}</p>
                <p className="text-xs text-muted flex items-center gap-1.5">
                  {item.condition}
                  {!item.exactMatch && (
                    <span className="px-1.5 py-0.5 rounded-full bg-accent/15 text-accent text-[10px]">Other parallel</span>
                  )}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-medium text-accent">{item.price !== null ? formatUsd(item.price) : "—"}</p>
                <p className="text-xs text-accent-2">View ↗</p>
              </div>
            </a>
          ))}
        </div>
      )}

      <p className="text-xs text-muted border-t border-border pt-3 mt-4">
        Live current asking prices from eBay — these are active listings, not confirmed sold prices.
      </p>
    </div>
  );
}
