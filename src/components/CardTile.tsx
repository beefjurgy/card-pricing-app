"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LibraryCard } from "@/lib/types";
import { SortOption } from "@/lib/librarySort";
import { valueEmoji } from "@/lib/valueEmoji";
import { isFeatured, toggleFeatured } from "@/lib/featured";

function formatUsd(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function CardTile({ card, sortBy }: { card: LibraryCard; sortBy?: SortOption }) {
  const title = [card.year, card.brand, card.setName].filter(Boolean).join(" ");
  // Read from localStorage only after mount — matches server-rendered markup
  // on first paint, then reflects the real per-browser featured state.
  const [featured, setFeatured] = useState(false);
  useEffect(() => setFeatured(isFeatured(card.id)), [card.id]);

  return (
    <Link
      href={sortBy ? `/card/${card.id}?sort=${sortBy}` : `/card/${card.id}`}
      className="group rounded-xl border border-border bg-surface overflow-hidden hover:border-accent-2/50 transition-colors flex flex-col"
    >
      <div className="relative aspect-[3/4] bg-surface-2">
        {card.imageUrl ? (
          <Image src={card.imageUrl} alt={card.player} fill className="object-cover" sizes="(max-width: 640px) 50vw, 220px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🃏</div>
        )}
        <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-black/60 text-white border border-white/30">
          {card.parallel && card.parallel.toLowerCase() !== "base" ? card.parallel : "Base"}
        </span>
        {card.isAutograph && (
          <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-black/60 text-white border border-white/30">
            ✍️
          </span>
        )}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setFeatured(toggleFeatured(card.id));
          }}
          title={featured ? "Remove from Featured" : "Add to Featured"}
          className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-black/60 border border-white/30 flex items-center justify-center text-sm hover:bg-black/80 transition-colors"
        >
          {featured ? "⭐" : "☆"}
        </button>
      </div>
      <div className="p-3 flex-1 flex flex-col gap-1">
        <p className="text-xs text-muted truncate">{title || "Unknown set"}</p>
        <p className="font-medium truncate group-hover:text-accent-2 transition-colors">{card.player}</p>
        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="font-semibold text-accent">{formatUsd(card.valuation.estimate)}</span>
          <span className="text-base">{valueEmoji(card.valuation.estimate)}</span>
        </div>
      </div>
    </Link>
  );
}
