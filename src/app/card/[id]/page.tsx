"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { LibraryCard } from "@/lib/types";
import { isSortOption, sortCards, SortOption } from "@/lib/librarySort";
import { ValuationCard } from "@/components/ValuationCard";
import { TrendingCard } from "@/components/TrendingCard";
import { PopulationCard } from "@/components/PopulationCard";
import { PopulationLinkOut } from "@/components/PopulationLinkOut";
import { SalesChart } from "@/components/SalesChart";
import { EbayListings } from "@/components/EbayListings";
import { ShopSupplies } from "@/components/ShopSupplies";
import { CardDescription } from "@/components/CardDescription";
import { CardTile } from "@/components/CardTile";
import { SectionHeading } from "@/components/SectionHeading";
import { CopyCertButton } from "@/components/CopyCertButton";
import { PurchaseInfo } from "@/components/PurchaseInfo";
import { getPlatformSearchUrl, getSetInfoUrl } from "@/lib/platformLinks";
import { getCertLookupUrl } from "@/lib/gradingLinks";

function formatUsd(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

interface Neighbors {
  prevId: string | null;
  nextId: string | null;
  index: number;
  total: number;
}

export default function CardDetailPage() {
  return (
    <Suspense>
      <CardDetailPageInner />
    </Suspense>
  );
}

function CardDetailPageInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParamsSort = useSearchParams().get("sort");
  const sortBy: SortOption = isSortOption(searchParamsSort) ? searchParamsSort : "recent";
  const [card, setCard] = useState<LibraryCard | null | undefined>(undefined);
  const [neighbors, setNeighbors] = useState<Neighbors | null>(null);
  const [allCards, setAllCards] = useState<LibraryCard[] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [togglingFeatured, setTogglingFeatured] = useState(false);

  useEffect(() => {
    fetch(`/api/library/${params.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setCard(data?.card ?? null));
  }, [params.id]);

  async function toggleFeatured() {
    if (!card || togglingFeatured) return;
    setTogglingFeatured(true);
    try {
      const res = await fetch(`/api/library/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: !card.isFeatured }),
      });
      const data = await res.json();
      if (data.card) setCard(data.card);
    } finally {
      setTogglingFeatured(false);
    }
  }

  // The library page's own sort order is passed through the URL (?sort=...)
  // rather than persisted anywhere, so Prev/Next walks the same ordering the
  // user was just browsing in — falling back to "recent" if the card was
  // opened without that param (e.g. a bookmarked/shared link).
  useEffect(() => {
    fetch("/api/library")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const cards = data?.cards as LibraryCard[] | undefined;
        if (!cards) return;
        setAllCards(cards);
        const ordered = sortCards(cards, sortBy);
        const index = ordered.findIndex((c) => c.id === params.id);
        if (index === -1) {
          setNeighbors(null);
          return;
        }
        setNeighbors({
          prevId: index > 0 ? ordered[index - 1].id : null,
          nextId: index < ordered.length - 1 ? ordered[index + 1].id : null,
          index,
          total: ordered.length,
        });
      });
  }, [params.id, sortBy]);

  useEffect(() => {
    if (!lightboxImage) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxImage(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxImage]);

  useEffect(() => {
    if (lightboxImage || !neighbors) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" && neighbors?.prevId) router.push(`/card/${neighbors.prevId}?sort=${sortBy}`);
      if (e.key === "ArrowRight" && neighbors?.nextId) router.push(`/card/${neighbors.nextId}?sort=${sortBy}`);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxImage, neighbors, sortBy, router]);

  // Same player, any other card in the library — not scoped to year/set/parallel,
  // since the point is just "what else do I have of this guy" at a glance.
  // A multi-player card (e.g. "Aaron Judge / Greg Bird") is split on "/" so
  // it shows up under either player's individual page too, not just an
  // exact whole-string match against another dual-player card naming the
  // exact same pair.
  const splitPlayers = (name: string) => name.split("/").map((p) => p.trim().toLowerCase());
  const otherCards = useMemo(() => {
    if (!allCards || !card) return [];
    const players = new Set(splitPlayers(card.player));
    return allCards.filter((c) => c.id !== card.id && splitPlayers(c.player).some((p) => players.has(p)));
  }, [allCards, card]);

  async function handleDelete() {
    if (!card) return;
    setDeleting(true);
    await fetch(`/api/library/${card.id}`, { method: "DELETE" });
    router.push("/");
  }

  if (card === undefined) {
    return <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 text-muted">Loading…</div>;
  }

  if (card === null) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
        <p className="text-muted">Card not found.</p>
        <Link href="/" className="text-accent-2 text-sm">
          Back to nukes
        </Link>
      </div>
    );
  }

  const title = [card.year, card.brand, card.setName].filter(Boolean).join(" ");
  const gradeLabel = card.gradingCompany && card.grade ? `${card.gradingCompany} ${card.grade}` : "Raw / Ungraded";
  const certUrl = getCertLookupUrl(card.gradingCompany, card.certNumber);
  const recentSales = [...card.sales].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => {
            // Prefer real browser back — it returns to wherever the user
            // actually came from (a filtered/sorted library view, another
            // card's "More from this player" list, etc.) instead of always
            // dropping back to the unfiltered full library. Only a direct
            // page load (no history to go back to) falls through to "/".
            if (window.history.length > 1) router.back();
            else router.push("/");
          }}
          className="text-muted hover:text-foreground text-sm"
        >
          ← Nukes
        </button>

        {neighbors && neighbors.total > 1 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted text-xs">
              {neighbors.index + 1} of {neighbors.total}
            </span>
            {neighbors.prevId ? (
              <Link
                href={`/card/${neighbors.prevId}?sort=${sortBy}`}
                className="px-2.5 py-1 rounded-md border border-border text-foreground hover:bg-surface-2 transition-colors"
              >
                ‹ Prev
              </Link>
            ) : (
              <span className="px-2.5 py-1 rounded-md border border-border text-muted opacity-40">‹ Prev</span>
            )}
            {neighbors.nextId ? (
              <Link
                href={`/card/${neighbors.nextId}?sort=${sortBy}`}
                className="px-2.5 py-1 rounded-md border border-border text-foreground hover:bg-surface-2 transition-colors"
              >
                Next ›
              </Link>
            ) : (
              <span className="px-2.5 py-1 rounded-md border border-border text-muted opacity-40">Next ›</span>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 grid md:grid-cols-[280px_1fr] gap-8 min-w-0">
        <div className="min-w-0">
          <div
            className={`group relative aspect-[3/4] rounded-xl overflow-hidden border border-border bg-surface ${
              card.imageUrl ? "cursor-zoom-in" : ""
            }`}
            onClick={() => {
              if (card.imageUrl) {
                setZoomed(false);
                setLightboxImage(card.imageUrl);
              }
            }}
          >
            {card.imageUrl ? (
              <>
                <Image src={card.imageUrl} alt={card.player} fill className="object-cover" sizes="280px" />
                <div className="absolute inset-0 hidden md:flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium bg-black/70 px-3 py-1.5 rounded-full">
                    🔍 Click to zoom
                  </span>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl">🃏</div>
            )}
          </div>

          {card.backImageUrl && (
            <div
              className="group relative aspect-[3/4] rounded-xl overflow-hidden border border-border bg-surface cursor-zoom-in mt-4"
              onClick={() => {
                setZoomed(false);
                setLightboxImage(card.backImageUrl);
              }}
            >
              <Image src={card.backImageUrl} alt={`${card.player} (back)`} fill className="object-cover" sizes="280px" />
              <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-black/60 text-white border border-white/30">
                Back
              </span>
              <div className="absolute inset-0 hidden md:flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium bg-black/70 px-3 py-1.5 rounded-full">
                  🔍 Click to zoom
                </span>
              </div>
            </div>
          )}

          {confirmingDelete ? (
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="flex-1 py-2 rounded-md border border-border text-muted hover:text-foreground transition-colors text-sm disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 rounded-md bg-down/90 text-white hover:bg-down transition-colors text-sm disabled:opacity-40"
              >
                {deleting ? "Removing…" : "Confirm"}
              </button>
            </div>
          ) : (
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={toggleFeatured}
                disabled={togglingFeatured}
                aria-label={card.isFeatured ? "Remove from Featured" : "Add to Featured"}
                title={card.isFeatured ? "Remove from Featured" : "Add to Featured"}
                className="w-8 h-8 rounded-md border border-border text-muted hover:text-foreground hover:border-accent-2/40 transition-colors flex items-center justify-center disabled:opacity-50"
              >
                {card.isFeatured ? "⭐" : "☆"}
              </button>
              <button
                onClick={() => setConfirmingDelete(true)}
                aria-label="Remove card"
                title="Remove card"
                className="w-8 h-8 rounded-md border border-border text-muted hover:text-down hover:border-down/40 hover:bg-down/10 transition-colors flex items-center justify-center"
              >
                🗑️
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6 min-w-0">
          <div>
            <p className="text-muted text-sm">
              {title || "Unknown set"}{" "}
              <a
                href={getSetInfoUrl(card)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-2 hover:underline"
              >
                Set info ↗
              </a>
            </p>
            <h1 className="text-4xl font-bold tracking-tight">{card.player}</h1>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {card.cardNumber && (
                <span className="px-2 py-1 rounded-full bg-surface-2 border border-border">#{card.cardNumber}</span>
              )}
              {card.parallel && (
                <span className="px-2 py-1 rounded-full bg-surface-2 border border-border">{card.parallel}</span>
              )}
              {certUrl ? (
                <a
                  href={certUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-full bg-accent/15 text-accent border border-accent/30 font-medium hover:bg-accent/25 transition-colors"
                >
                  ✓ {gradeLabel} ↗
                </a>
              ) : (
                <span className="px-2 py-1 rounded-full bg-surface-2 border border-border">{gradeLabel}</span>
              )}
              {card.certNumber && <CopyCertButton certNumber={card.certNumber} />}
              <span className="px-2 py-1 rounded-full bg-surface-2 border border-border">{card.sport}</span>
              {card.isAutograph && (
                <span className="px-2 py-1 rounded-full bg-accent/15 text-accent border border-accent/30 font-medium">
                  ✍️ {[card.autographCompany, card.autographGrade && `Auto ${card.autographGrade}`].filter(Boolean).join(" ") || "Autographed"}
                </span>
              )}
            </div>
          </div>

          <ValuationCard valuation={card.valuation} cardId={card.id} onRefresh={setCard} />

          <CardDescription identity={card} />

          <PurchaseInfo card={card} onUpdate={setCard} />

          {card.trending && <TrendingCard trending={card.trending} />}

          {card.population ? (
            <PopulationCard population={card.population} />
          ) : (
            card.gradingCompany &&
            card.grade && <PopulationLinkOut gradingCompany={card.gradingCompany} certNumber={card.certNumber} />
          )}

          <EbayListings identity={card} />

          {recentSales.length > 0 && (
            <div className="rounded-xl border border-border bg-surface p-5">
              <SectionHeading className="mb-4">Recent Sales</SectionHeading>
              <SalesChart sales={recentSales} />
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted border-b border-border">
                      <th className="py-2 pr-4 font-normal">Date</th>
                      <th className="py-2 pr-4 font-normal">Price</th>
                      <th className="py-2 pr-4 font-normal">Grade</th>
                      <th className="py-2 font-normal">Platform</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSales.map((sale, i) => (
                      <tr key={i} className="border-b border-border/60 last:border-0">
                        <td className="py-2 pr-4 text-muted">
                          {new Date(sale.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="py-2 pr-4 font-medium">{formatUsd(sale.price)}</td>
                        <td className="py-2 pr-4 text-muted">{sale.grade}</td>
                        <td className="py-2">
                          <a
                            href={getPlatformSearchUrl(sale.platform, card)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent-2 hover:underline"
                          >
                            {sale.platform} ↗
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {otherCards.length > 0 && (
            <div>
              <SectionHeading className="mb-3">More From This Player</SectionHeading>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {otherCards.map((c) => (
                  <CardTile key={c.id} card={c} />
                ))}
              </div>
            </div>
          )}

          <ShopSupplies />

          {card.identifyNotes && (
            <p className="text-xs text-muted">Identification notes: {card.identifyNotes}</p>
          )}
        </div>
      </div>

      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-6"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-surface-2 text-foreground hover:bg-surface flex items-center justify-center text-lg"
            aria-label="Close"
          >
            ✕
          </button>
          <div
            className={`max-w-[92vw] max-h-[88vh] ${zoomed ? "overflow-auto" : "overflow-hidden"} rounded-lg`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxImage}
              alt={card.player}
              onClick={() => setZoomed((z) => !z)}
              className={`transition-transform duration-200 ${zoomed ? "cursor-zoom-out scale-[2]" : "cursor-zoom-in max-h-[88vh] max-w-[92vw] object-contain"}`}
            />
          </div>
          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-xs text-muted">
            Click image to {zoomed ? "zoom out" : "zoom in"} · Esc to close
          </p>
        </div>
      )}
    </div>
  );
}
