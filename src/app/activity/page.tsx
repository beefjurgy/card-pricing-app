"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { LibraryCard } from "@/lib/types";

type ActivityItem =
  | { type: "card_added"; timestamp: string; actorUsername: string; actorAvatarUrl: string | null; card: LibraryCard }
  | {
      type: "comment";
      timestamp: string;
      actorUsername: string;
      actorAvatarUrl: string | null;
      body: string;
      target: { kind: "card"; cardId: string; player: string; imageUrl: string | null } | { kind: "profile"; username: string };
    }
  | {
      type: "reaction";
      timestamp: string;
      actorUsername: string;
      actorAvatarUrl: string | null;
      reaction: "heart" | "thumbs_up";
      cardId: string;
      player: string;
      imageUrl: string | null;
    };

const REACTION_EMOJI: Record<"heart" | "thumbs_up", string> = { heart: "❤️", thumbs_up: "👍" };

function formatUsd(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ActivityThumb({ imageUrl }: { imageUrl: string | null }) {
  return imageUrl ? (
    <Image src={imageUrl} alt="" width={48} height={48} className="w-12 h-12 rounded object-cover shrink-0" unoptimized />
  ) : (
    <div className="w-12 h-12 rounded bg-surface-2 shrink-0 flex items-center justify-center text-lg">🃏</div>
  );
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
      <p className="text-muted text-sm mt-1">New cards, comments, and reactions from people you follow.</p>

      <div className="mt-6">
        {!items ? (
          <p className="text-muted text-sm">Loading…</p>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
            <p className="text-muted text-sm">
              Nothing here yet — follow someone from their profile to see what they're up to.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, i) => {
              if (item.type === "card_added") {
                return (
                  <Link
                    key={i}
                    href={`/card/${item.card.id}`}
                    className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 hover:border-accent-2/50 transition-colors"
                  >
                    <ActivityThumb imageUrl={item.card.imageUrl} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-medium">@{item.actorUsername}</span>{" "}
                        <span className="text-muted">added</span> {item.card.player}
                      </p>
                      <p className="text-xs text-muted truncate">
                        {[item.card.year, item.card.brand, item.card.setName].filter(Boolean).join(" ")}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-medium text-accent text-sm">{formatUsd(item.card.valuation.estimate)}</p>
                      <p className="text-xs text-muted">{formatDate(item.timestamp)}</p>
                    </div>
                  </Link>
                );
              }

              if (item.type === "comment") {
                const href = item.target.kind === "card" ? `/card/${item.target.cardId}` : `/u/${item.target.username}`;
                return (
                  <Link
                    key={i}
                    href={href}
                    className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 hover:border-accent-2/50 transition-colors"
                  >
                    <ActivityThumb imageUrl={item.target.kind === "card" ? item.target.imageUrl : null} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-medium">@{item.actorUsername}</span>{" "}
                        <span className="text-muted">commented on</span>{" "}
                        {item.target.kind === "card" ? item.target.player : `@${item.target.username}'s profile`}
                      </p>
                      <p className="text-xs text-muted truncate">&ldquo;{item.body}&rdquo;</p>
                    </div>
                    <p className="text-xs text-muted shrink-0">{formatDate(item.timestamp)}</p>
                  </Link>
                );
              }

              return (
                <Link
                  key={i}
                  href={`/card/${item.cardId}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 hover:border-accent-2/50 transition-colors"
                >
                  <ActivityThumb imageUrl={item.imageUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">@{item.actorUsername}</span>{" "}
                      <span className="text-muted">reacted {REACTION_EMOJI[item.reaction]} to</span> {item.player}
                    </p>
                  </div>
                  <p className="text-xs text-muted shrink-0">{formatDate(item.timestamp)}</p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
