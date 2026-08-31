"use client";

import { useState } from "react";
import { LibraryCard } from "@/lib/types";

const PLATFORM_OPTIONS = ["Whatnot", "eBay", "Facebook", "Store"];

function formatUsd(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

// A bare "YYYY-MM-DD" string (what <input type="date"> gives us) is parsed by
// `new Date(...)` as UTC midnight, then toLocaleDateString renders it in the
// browser's local timezone — for any timezone behind UTC that silently
// shifts the displayed date back a day. Appending a local-time marker avoids
// the UTC interpretation entirely.
function formatLocalDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function PurchaseInfo({ card, onUpdate }: { card: LibraryCard; onUpdate: (card: LibraryCard) => void }) {
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(card.purchasePrice != null ? String(card.purchasePrice) : "");
  const [date, setDate] = useState(card.purchaseDate ? card.purchaseDate.slice(0, 10) : "");
  const [platform, setPlatform] = useState(card.purchasePlatform ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/library/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchasePrice: price.trim() ? Number(price) : null,
          purchaseDate: date || null,
          purchasePlatform: platform.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.card) {
        onUpdate(data.card);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 space-y-3 text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1">
            Price Paid
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 45.00"
              className="px-2.5 py-1.5 rounded-md bg-surface-2 border border-border focus:border-accent-2 outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            Date Purchased
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-md bg-surface-2 border border-border focus:border-accent-2 outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            Platform / Source
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

  if (typeof card.purchasePrice !== "number") {
    return (
      <button onClick={() => setEditing(true)} className="text-sm text-muted hover:text-foreground transition-colors text-left">
        + Add what you paid for this card
      </button>
    );
  }

  const paidPrice = card.purchasePrice;
  const diff = card.valuation.estimate - paidPrice;
  const positive = diff >= 0;
  const pctLabel = paidPrice > 0 ? ` (${positive ? "+" : ""}${Math.round((diff / paidPrice) * 1000) / 10}%)` : "";

  return (
    <div className="rounded-xl border border-border bg-surface p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
      <div className="text-muted">
        Paid <span className="text-foreground font-medium">{formatUsd(paidPrice)}</span>
        {card.purchasePlatform && ` on ${card.purchasePlatform}`}
        {card.purchaseDate && ` · ${formatLocalDate(card.purchaseDate)}`}
      </div>
      <div className="flex items-center gap-3">
        <span className={`font-medium ${positive ? "text-up" : "text-down"}`}>
          {positive ? "+" : ""}
          {formatUsd(diff)}
          {pctLabel}
        </span>
        <button onClick={() => setEditing(true)} className="text-xs text-muted hover:text-foreground transition-colors">
          Edit
        </button>
      </div>
    </div>
  );
}
