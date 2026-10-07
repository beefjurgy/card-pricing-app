"use client";

import { useState } from "react";
import { LibraryCard } from "@/lib/types";
import { buildListingDescription, buildListingTitle } from "@/lib/listingHelper";

function formatUsd(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable or permission denied — nothing reasonable
      // to fall back to, so this just silently stays a no-op.
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
        <button onClick={handleCopy} className="text-xs text-accent hover:underline">
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <p className="text-sm whitespace-pre-wrap rounded-md bg-surface-2 border border-border p-3">{value}</p>
    </div>
  );
}

// No API calls, no new data stored anywhere — just a title/description
// generated live from the card's own identity fields, so a collector can
// paste a decent starting point into eBay's or Whatnot's own listing form
// instead of starting from a blank page. Deliberately not an actual
// listing integration (no OAuth, no API, nothing auto-published) — see
// [[card-nukes-future-features]] item 1 for why the real eBay Sell API
// flow is a bigger, separate project.
export function PrepareListing({ card }: { card: LibraryCard }) {
  const [open, setOpen] = useState(false);
  const title = buildListingTitle(card);
  const description = buildListingDescription(card);

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center justify-between w-full text-left">
        <span className="text-xs uppercase tracking-wide text-muted">📋 Prepare Listing</span>
        <span className="text-muted text-sm">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="mt-4 space-y-4">
          <CopyField label="Suggested title" value={title} />
          <CopyField label="Suggested description" value={description} />
          <div>
            <p className="text-xs uppercase tracking-wide text-muted mb-1">Suggested price</p>
            <p className="text-sm">
              Estimated at <span className="font-semibold text-accent">{formatUsd(card.valuation.estimate)}</span>
              {" "}(range {formatUsd(card.valuation.low)}–{formatUsd(card.valuation.high)})
            </p>
          </div>
          <div className="flex items-center gap-4 pt-3 border-t border-border">
            <a
              href="https://www.ebay.com/sl/sell"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-accent-2 hover:underline"
            >
              Start listing on eBay ↗
            </a>
            <a href="https://www.whatnot.com/" target="_blank" rel="noopener noreferrer" className="text-sm text-accent-2 hover:underline">
              Open Whatnot ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
