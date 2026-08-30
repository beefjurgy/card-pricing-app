"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LibraryCard } from "@/lib/types";

// Replaces the plain "Nukes" nav link — the header logo already goes to the
// library, so this slot is free to be a fun shortcut instead: roll the dice,
// land on a random card from the collection.
export function RandomCardButton() {
  const router = useRouter();
  const [rolling, setRolling] = useState(false);

  async function roll() {
    setRolling(true);
    try {
      const res = await fetch("/api/library");
      const data = await res.json();
      const cards = data.cards as LibraryCard[] | undefined;
      if (cards && cards.length > 0) {
        const pick = cards[Math.floor(Math.random() * cards.length)];
        router.push(`/card/${pick.id}`);
        return;
      }
    } finally {
      setRolling(false);
    }
  }

  return (
    <button
      onClick={roll}
      disabled={rolling}
      title="Show me a random card"
      aria-label="Show me a random card"
      className="px-3 py-2 rounded-md text-muted hover:text-foreground hover:bg-surface-2 transition-colors disabled:opacity-40 text-lg leading-none"
    >
      {rolling ? "🎲…" : "🎲"}
    </button>
  );
}
