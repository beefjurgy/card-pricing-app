"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { LibraryCard } from "@/lib/types";

interface ActivityItem {
  card: LibraryCard;
  ownerUsername: string;
  ownerAvatarUrl: string | null;
}

function formatUsd(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ActivityPage() {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<ActivityItem[] | null>(null);

  useEffect(() => {
    if (!session) return;
    fetch("/api/activity")
      .then((r) => r.json())
      .then((data) => setItems(data.items ?? []))
      .catch(() => setItems([]));
  }, [session]);

  if (status === "loading") return null;

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 sm:px-6 py-16 text-center">
        <p className="text-muted mb-4">Sign in to see activity from people you follow.</p>
        <Link href="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Activity</h1>
      <p className="text-muted text-sm mt-1">New cards from people you follow.</p>

      <div className="mt-6">
        {!items ? (
          <p className="text-muted text-sm">Loading…</p>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
            <p className="text-muted text-sm">
              Nothing here yet — follow someone from their profile to see their new cards show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <Link
                key={item.card.id}
                href={`/card/${item.card.id}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 hover:border-accent-2/50 transition-colors"
              >
                {item.card.imageUrl ? (
                  <Image src={item.card.imageUrl} alt="" width={48} height={48} className="w-12 h-12 rounded object-cover shrink-0" unoptimized />
                ) : (
                  <div className="w-12 h-12 rounded bg-surface-2 shrink-0 flex items-center justify-center text-lg">🃏</div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">@{item.ownerUsername}</span>{" "}
                    <span className="text-muted">added</span> {item.card.player}
                  </p>
                  <p className="text-xs text-muted truncate">
                    {[item.card.year, item.card.brand, item.card.setName].filter(Boolean).join(" ")}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-medium text-accent text-sm">{formatUsd(item.card.valuation.estimate)}</p>
                  <p className="text-xs text-muted">{formatDate(item.card.dateAdded)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
