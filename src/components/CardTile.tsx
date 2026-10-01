"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { LibraryCard } from "@/lib/types";
import { SortOption } from "@/lib/librarySort";
import { valueEmoji } from "@/lib/valueEmoji";
import { isProtectedValuation } from "@/lib/valuationProtection";

function formatUsd(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function CardTile({
  card,
  sortBy,
  onFeaturedChange,
  onCardUpdate,
  disableLink,
}: {
  card: LibraryCard;
  sortBy?: SortOption;
  onFeaturedChange?: (id: string, isFeatured: boolean) => void;
  // Quick "refresh valuation" from the grid, without opening the card page
  // first — hands back the full updated card so the parent can splice it
  // into whatever list it's rendering.
  onCardUpdate?: (card: LibraryCard) => void;
  // For the logged-out landing page's preview grid — a teaser, not a
  // gateway into browsing individual card pages while unauthenticated.
  disableLink?: boolean;
}) {
  const title = [card.year, card.brand, card.setName].filter(Boolean).join(" ");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { data: session } = useSession();
  // "Owns THIS card," not just "is signed in" — CardTile is also used to
  // render other people's cards (public profiles, the activity feed), and
  // without this check a signed-in viewer saw the Featured-star and
  // refresh-valuation controls on cards they don't own.
  const isOwner = Boolean(session?.user?.id) && session?.user?.id === card.userId;

  async function toggleFeatured(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (saving) return;
    const next = !card.isFeatured;
    setSaving(true);
    try {
      const res = await fetch(`/api/library/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: next }),
      });
      const data = await res.json();
      if (data.card) onFeaturedChange?.(card.id, data.card.isFeatured);
    } finally {
      setSaving(false);
    }
  }

  async function refreshValuation(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (refreshing) return;
    const protectedValuation = isProtectedValuation(card.valuation.note);
    if (protectedValuation && !window.confirm("This price was manually verified by you. Replace it with a fresh automatic estimate?")) {
      return;
    }
    setRefreshing(true);
    try {
      const res = await fetch(`/api/library/${card.id}/refresh-valuation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: protectedValuation }),
      });
      const data = await res.json();
      if (data.card) onCardUpdate?.(data.card);
    } finally {
      setRefreshing(false);
    }
  }

  const tileClassName = "group rounded-xl border border-border bg-surface overflow-hidden hover:border-accent-2/50 transition-colors flex flex-col";

  const content = (
    <>
      <div className="relative aspect-[3/4] bg-surface-2">
        {card.imageUrl ? (
          <Image src={card.imageUrl} alt={card.player} fill className="object-cover" sizes="(max-width: 640px) 50vw, 220px" unoptimized />
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
        {isOwner && (
          <button
            onClick={toggleFeatured}
            disabled={saving}
            title={card.isFeatured ? "Remove from Featured" : "Add to Featured"}
            className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-black/60 border border-white/30 flex items-center justify-center text-sm hover:bg-black/80 transition-colors disabled:opacity-50"
          >
            {card.isFeatured ? "⭐" : "☆"}
          </button>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col gap-1">
        <p className="text-xs text-muted truncate">{title || "Unknown set"}</p>
        <p className="font-medium truncate group-hover:text-accent-2 transition-colors">{card.player}</p>
        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="font-semibold text-accent">{formatUsd(card.valuation.estimate)}</span>
          <div className="flex items-center gap-1.5">
            {isOwner && (
              <button
                onClick={refreshValuation}
                disabled={refreshing}
                title="Refresh valuation"
                className="text-muted hover:text-foreground transition-colors disabled:opacity-50 text-sm leading-none"
              >
                {refreshing ? "⏳" : "🔄"}
              </button>
            )}
            <span className="text-base">{valueEmoji(card.valuation.estimate)}</span>
          </div>
        </div>
      </div>
    </>
  );

  if (disableLink) {
    return <div className={tileClassName}>{content}</div>;
  }

  return (
    <Link href={sortBy ? `/card/${card.id}?sort=${sortBy}` : `/card/${card.id}`} className={tileClassName}>
      {content}
    </Link>
  );
}
