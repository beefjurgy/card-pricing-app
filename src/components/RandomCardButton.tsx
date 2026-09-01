"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { LibraryCard } from "@/lib/types";

// Replaces the plain "Nukes" nav link — the header logo already goes to the
// library, so this slot is free to be a fun shortcut instead: roll the dice,
// land on a random card from the collection. Hidden while signed out, same
// as the other owner-only header controls — a logged-out visitor sees the
// generic landing page, not a browsable collection to roll through.
export function RandomCardButton() {
  const router = useRouter();
  const { data: session } = useSession();
  const [rolling, setRolling] = useState(false);

  async function roll() {
    setRolling(true);
    const start = Date.now();
    // A minimum on-screen time for the roll animation — without it, a fast
    // response could navigate away before the wiggle even finishes one cycle.
    const minDurationMs = 500;
    try {
      const res = await fetch("/api/library");
      const data = await res.json();
      const cards = data.cards as LibraryCard[] | undefined;
      const elapsed = Date.now() - start;
      if (elapsed < minDurationMs) await new Promise((resolve) => setTimeout(resolve, minDurationMs - elapsed));
      if (cards && cards.length > 0) {
        const pick = cards[Math.floor(Math.random() * cards.length)];
        router.push(`/card/${pick.id}`);
        return;
      }
    } finally {
      setRolling(false);
    }
  }

  if (!session) return null;

  return (
    <button
      onClick={roll}
      disabled={rolling}
      title="Show me a random card"
      aria-label="Show me a random card"
      className="px-3 py-2 rounded-md text-muted hover:text-foreground hover:bg-surface-2 transition-colors disabled:opacity-40 text-lg leading-none"
    >
      <span className={rolling ? "animate-dice-roll" : ""}>🎲🎲</span>
    </button>
  );
}
