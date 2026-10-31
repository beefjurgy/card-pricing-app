"use client";

import { useState } from "react";
import { LibraryCard } from "@/lib/types";

const PLATFORM_OPTIONS = ["eBay", "Whatnot", "Facebook", "Store", "In Person"];

function formatUsd(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

// Same UTC-midnight pitfall as PurchaseInfo's formatLocalDate — a bare
// "YYYY-MM-DD" from <input type="date"> needs a local-time marker before
// parsing, or it can render a day early in timezones behind UTC.
function formatLocalDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function SoldInfo({ card, onUpdate }: { card: LibraryCard; onUpdate: (card: LibraryCard) => void }) {
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(card.soldPrice != null ? String(card.soldPrice) : "");
  const [date, setDate] = useState(card.soldDate ? card.soldDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [platform, setPlatform] = useState(card.soldPlatform ?? "");
  const [saving, setSaving] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/library/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.card) onUpdate(data.card);
      return data.card;
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    const saved = await patch({
      isSold: true,
      soldPrice: price.trim() ? Number(price) : null,
      soldDate: date || null,
      soldPlatform: platform.trim() || null,
    });
    if (saved) setEditing(false);
  }

  async function unmarkSold() {
    if (!window.confirm("Unmark this card as sold? Its sold price/date will be cleared.")) return;
    await patch({ isSold: false, soldPrice: null, soldDate: null, soldPlatform: null });
  }

  if (editing) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 space-y-3 text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1">
            Sold For
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 50.00"
              className="px-2.5 py-1.5 rounded-md bg-surface-2 border border-border focus:border-accent-2 outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            Date Sold
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-md bg-surface-2 border border-border focus:border-accent-2 outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            Platform
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="px-2.5 py-1.5 rounded-md bg-surface-2 border border-border focus:border-accent-2 outline-none"
            >
              <option value="">—</option>
              {platform && !PLATFORM_OPTIONS.includes(platform) && <option value={platform}>{platform}</option>}
              {PLATFORM_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(false)}
            disabled={saving}
            className="px-3 py-1.5 rounded-md border border-border text-muted hover:text-foreground transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-3 py-1.5 rounded-md bg-brand text-white hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    );
  }

  if (!card.isSold) {
    return (
      <button onClick={() => setEditing(true)} className="text-sm text-muted hover:text-foreground transition-colors text-left">
        + Mark this card as sold
      </button>
    );
  }

  const { purchasePrice, soldPrice } = card;
  const gain = typeof purchasePrice === "number" && typeof soldPrice === "number" ? soldPrice - purchasePrice : null;
  const positive = (gain ?? 0) >= 0;

  return (
    <div className="rounded-xl border border-border bg-surface p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
      <div className="text-muted">
        <span className="text-foreground font-medium">SOLD</span>
        {typeof card.soldPrice === "number" && (
          <>
            {" for "}
            <span className="text-foreground font-medium">{formatUsd(card.soldPrice)}</span>
          </>
        )}
        {card.soldPlatform && ` on ${card.soldPlatform}`}
        {card.soldDate && ` · ${formatLocalDate(card.soldDate)}`}
      </div>
      <div className="flex items-center gap-3">
        {gain !== null && (
          <span className={`font-medium ${positive ? "text-up" : "text-down"}`}>
            {positive ? "+" : ""}
            {formatUsd(gain)}
          </span>
        )}
        <button onClick={() => setEditing(true)} disabled={saving} className="text-xs text-muted hover:text-foreground transition-colors">
          Edit
        </button>
        <button onClick={unmarkSold} disabled={saving} className="text-xs text-muted hover:text-down transition-colors">
          Unmark
        </button>
      </div>
    </div>
  );
}
