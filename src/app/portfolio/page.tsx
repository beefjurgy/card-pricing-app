"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  Cell,
} from "recharts";
import { LibraryCard } from "@/lib/types";

function formatUsd(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

// No existing per-sport color mapping anywhere in the app (the sport
// filter pills on the library page are plain black/gray, not color-coded)
// — a small fixed categorical palette, cycled by index over however many
// distinct sports actually show up in the collection.
const SPORT_COLORS = ["#16a34a", "#3b82f6", "#f59e0b", "#8b5cf6", "#f43f5e", "#9ca3af", "#0891b2", "#ca8a04"];

export default function PortfolioPage() {
  const [cards, setCards] = useState<LibraryCard[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/library")
      .then((r) => {
        if (!r.ok) throw new Error(`Request failed: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setCards(data.cards);
        setError(false);
      })
      .catch(() => setError(true));
  }, []);

  // Only cards with a recorded purchase price have a real cost basis — same
  // subset the library page's overall gain/loss percentage is built from.
  // Ordered by when each card was actually bought (falling back to when it
  // was added to the app if no purchase date was recorded), running totals
  // show how cumulative cost vs. cumulative current value have grown
  // alongside each other as the collection was actually built, not as it
  // happened to get scanned in.
  const points = useMemo(() => {
    if (!cards) return [];
    const costBasisCards = cards.filter((c): c is LibraryCard & { purchasePrice: number } => typeof c.purchasePrice === "number");
    const sortKey = (c: LibraryCard) => c.purchaseDate ?? c.dateAdded;
    const ordered = [...costBasisCards].sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : 1));

    let cumulativePaid = 0;
    let cumulativeValue = 0;
    return ordered.map((c) => {
      cumulativePaid += c.purchasePrice;
      cumulativeValue += c.valuation.estimate;
      const displayDate = c.purchaseDate ? new Date(`${c.purchaseDate}T00:00:00`) : new Date(c.dateAdded);
      return {
        date: displayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        player: c.player,
        paid: cumulativePaid,
        value: cumulativeValue,
      };
    });
  }, [cards]);

  const latest = points[points.length - 1];
  const overallDiff = latest ? latest.value - latest.paid : 0;
  const overallPct = latest && latest.paid > 0 ? Math.round((overallDiff / latest.paid) * 1000) / 10 : null;

  // The library page's "Est. total value" — every card, whether or not a
  // purchase price was ever recorded. Shown here too, clearly labeled, so
  // it's obvious this is a different (larger) figure than "Priced Value"
  // below rather than looking like the same number failing to match.
  const fullCollectionValue = cards?.reduce((sum, c) => sum + c.valuation.estimate, 0) ?? 0;

  // By value rather than card count — a portfolio page is about what the
  // collection is worth, and one $2,000 card should outweigh ten $5 ones.
  const sportBreakdown = useMemo(() => {
    if (!cards) return [];
    const totals = new Map<string, { value: number; count: number }>();
    for (const c of cards) {
      const entry = totals.get(c.sport) ?? { value: 0, count: 0 };
      entry.value += c.valuation.estimate;
      entry.count += 1;
      totals.set(c.sport, entry);
    }
    return [...totals.entries()]
      .map(([sport, { value, count }]) => ({ sport, value, count }))
      .sort((a, b) => b.value - a.value);
  }, [cards]);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
      <Link href="/" className="text-muted hover:text-foreground text-sm">
        ← Nukes
      </Link>

      <h1 className="text-3xl font-bold tracking-tight mt-4">Portfolio Over Time</h1>
      <p className="text-muted text-sm mt-1">
        Cumulative cost vs. current estimated value, in the order cards were bought.
      </p>

      {error && <p className="text-down text-sm mt-6">Couldn&apos;t load your library.</p>}

      {!error && cards && points.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center mt-6">
          <p className="text-muted text-sm">
            No cards with a recorded purchase price yet — add what you paid for a card to see it charted here.
          </p>
        </div>
      )}

      {sportBreakdown.length > 0 && (
        <div className="mt-8 rounded-xl border border-border bg-surface p-5">
          <p className="text-xs text-muted uppercase tracking-wide mb-4">Sport Breakdown</p>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-full sm:w-56 h-56 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sportBreakdown} dataKey="value" nameKey="sport" innerRadius="55%" outerRadius="90%" paddingAngle={2}>
                    {sportBreakdown.map((entry, i) => (
                      <Cell key={entry.sport} fill={SPORT_COLORS[i % SPORT_COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-surface-2)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      color: "var(--color-foreground)",
                      fontSize: 13,
                    }}
                    formatter={(value, _name, item) => [formatUsd(Number(value)), item.payload.sport]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              {sportBreakdown.map((entry, i) => (
                <div key={entry.sport} className="flex items-center gap-2 text-sm">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: SPORT_COLORS[i % SPORT_COLORS.length] }}
                  />
                  <span className="flex-1">{entry.sport}</span>
                  <span className="text-muted">
                    {entry.count} card{entry.count === 1 ? "" : "s"}
                  </span>
                  <span className="font-medium w-20 text-right">{formatUsd(entry.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {points.length > 0 && (
        <>
          <div className="mt-6 flex flex-wrap gap-6">
            <div>
              <p className="text-xs text-muted uppercase tracking-wide">Full Collection Value</p>
              <p className="text-2xl font-bold text-accent">{formatUsd(fullCollectionValue)}</p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-border flex flex-wrap gap-6">
            <div>
              <p className="text-xs text-muted uppercase tracking-wide">Paid (priced cards)</p>
              <p className="text-2xl font-bold">{formatUsd(latest.paid)}</p>
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wide">Value (priced cards)</p>
              <p className="text-2xl font-bold text-accent">{formatUsd(latest.value)}</p>
            </div>
            {overallPct !== null && (
              <div>
                <p className="text-xs text-muted uppercase tracking-wide">Gain / Loss</p>
                <p className={`text-2xl font-bold ${overallDiff >= 0 ? "text-up" : "text-down"}`}>
                  {overallDiff >= 0 ? "+" : ""}
                  {formatUsd(overallDiff)} ({overallDiff >= 0 ? "+" : ""}
                  {overallPct}%)
                </p>
              </div>
            )}
          </div>
          <p className="text-xs text-muted mt-2">
            The chart and figures below only cover cards with a recorded purchase price — that's the only way a real gain/loss
            can be computed.
          </p>

          <div className="h-96 w-full mt-8">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" stroke="var(--color-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="var(--color-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={64}
                  tickFormatter={(v) => `$${v >= 1000 ? `${Math.round(v / 100) / 10}k` : v}`}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface-2)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    color: "var(--color-foreground)",
                    fontSize: 13,
                  }}
                  formatter={(value, name) => [`$${Number(value).toLocaleString()}`, name]}
                  labelFormatter={(label, payload) => {
                    const player = payload?.[0]?.payload?.player;
                    return player ? `${label} · bought ${player}` : label;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Line
                  type="monotone"
                  dataKey="value"
                  name="Est. Value"
                  stroke="var(--color-accent)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="paid"
                  name="Total Paid"
                  stroke="var(--color-muted)"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
