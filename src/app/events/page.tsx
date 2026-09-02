"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CardEvent } from "@/lib/events";

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function EventsPage() {
  const [events, setEvents] = useState<CardEvent[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/events")
      .then((r) => {
        if (!r.ok) throw new Error(`Request failed: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setEvents(data.events);
        setError(false);
      })
      .catch(() => setError(true));
  }, []);

  // Grouped by calendar month so a long list reads as a real calendar
  // rather than one undifferentiated scroll of dates.
  const groups = useMemo(() => {
    if (!events) return [];
    const map = new Map<string, CardEvent[]>();
    for (const e of events) {
      const label = new Date(`${e.startDate}T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(e);
    }
    return [...map.entries()];
  }, [events]);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <Link href="/" className="text-muted hover:text-foreground text-sm">
        ← Nukes
      </Link>

      <h1 className="text-3xl font-bold tracking-tight mt-4">Card Shows</h1>
      <p className="text-muted text-sm mt-1">
        Upcoming sports and trading card shows across the country, pulled from Ticketmaster and SeatGeek.
      </p>

      {error && <p className="text-down text-sm mt-6">Couldn&apos;t load events.</p>}

      {!error && !events && <div className="text-muted py-16 text-center">Loading…</div>}

      {!error && events && events.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center mt-6">
          <p className="text-muted text-sm">No upcoming shows found yet.</p>
        </div>
      )}

      <div className="mt-8 space-y-8">
        {groups.map(([month, monthEvents]) => (
          <div key={month}>
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted mb-3">{month}</h2>
            <div className="space-y-2">
              {monthEvents.map((e) => (
                <a
                  key={e.id}
                  href={e.url ?? undefined}
                  target={e.url ? "_blank" : undefined}
                  rel={e.url ? "noopener noreferrer" : undefined}
                  className={`flex items-center gap-4 rounded-lg border border-border bg-surface p-3 transition-colors ${
                    e.url ? "hover:border-accent-2/50" : ""
                  }`}
                >
                  <div className="w-14 shrink-0 text-center">
                    <div className="text-sm font-semibold text-accent">{formatDate(e.startDate)}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{e.name}</p>
                    <p className="text-xs text-muted truncate">
                      {[e.venue, e.city, e.state].filter(Boolean).join(", ") || "Location TBA"}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
