"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type ReactionType = "heart" | "thumbs_up";

interface ReactionSummary {
  heart: number;
  thumbsUp: number;
  viewerReaction: ReactionType | null;
}

export function CardReactions({ cardId }: { cardId: string }) {
  const { data: session } = useSession();
  const [summary, setSummary] = useState<ReactionSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/library/${cardId}/reactions`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [cardId]);

  async function react(type: ReactionType) {
    if (!session || !summary) return;

    // Optimistic update, computed from the toggle rule: same type turns
    // it off, a different type switches (removing the old count, adding
    // the new one).
    const prevReaction = summary.viewerReaction;
    const nextReaction = prevReaction === type ? null : type;
    const delta = (r: ReactionType) => (prevReaction === r ? -1 : 0) + (nextReaction === r ? 1 : 0);
    setSummary({
      heart: summary.heart + delta("heart"),
      thumbsUp: summary.thumbsUp + delta("thumbs_up"),
      viewerReaction: nextReaction,
    });

    try {
      const res = await fetch(`/api/library/${cardId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction: type }),
      });
      const data = await res.json();
      setSummary(data);
    } catch {
      setSummary(summary);
    }
  }

  if (!summary) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => react("heart")}
        disabled={!session}
        title={session ? "React with a heart" : "Sign in to react"}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
          summary.viewerReaction === "heart"
            ? "bg-down/10 border-down/30 text-down"
            : "bg-surface-2 border-border text-muted hover:text-foreground"
        } disabled:cursor-default`}
      >
        <span>❤️</span>
        <span>{summary.heart}</span>
      </button>
      <button
        onClick={() => react("thumbs_up")}
        disabled={!session}
        title={session ? "React with a thumbs up" : "Sign in to react"}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
          summary.viewerReaction === "thumbs_up"
            ? "bg-accent/10 border-accent/30 text-accent"
            : "bg-surface-2 border-border text-muted hover:text-foreground"
        } disabled:cursor-default`}
      >
        <span>👍</span>
        <span>{summary.thumbsUp}</span>
      </button>
    </div>
  );
}
