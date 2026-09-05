"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
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
import { PlayerBuzz, HeatScore } from "@/components/PlayerBuzz";
import { ShopSupplies } from "@/components/ShopSupplies";
import { CommentThread } from "@/components/CommentThread";
import { CardDescription } from "@/components/CardDescription";
import { CardTile } from "@/components/CardTile";
import { SectionHeading } from "@/components/SectionHeading";
import { PurchaseInfo } from "@/components/PurchaseInfo";
import { CardIdentityEditor } from "@/components/CardIdentityEditor";
import { SetInfoCard } from "@/components/SetInfoCard";
import { getPlatformSearchUrl } from "@/lib/platformLinks";

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
  const { data: session } = useSession();
  const isOwner = Boolean(session?.user?.id);
  const searchParamsSort = useSearchParams().get("sort");
  const sortBy: SortOption = isSortOption(searchParamsSort) ? searchParamsSort : "recent";
  const [card, setCard] = useState<LibraryCard | null | undefined>(undefined);
  const [neighbors, setNeighbors] = useState<Neighbors | null>(null);
  const [allCards, setAllCards] = useState<LibraryCard[] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // Tracks which of THIS card's own images is open — lets the lightbox's
  // arrows/arrow-keys toggle between front and back without closing,
  // instead of forcing a close-then-reopen just to flip the card over.
  const [lightboxSide, setLightboxSide] = useState<"front" | "back" | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [togglingFeatured, setTogglingFeatured] = useState(false);
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<"front" | "back" | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [ebayListingCount, setEbayListingCount] = useState<number | null>(null);
  const [heat, setHeat] = useState<HeatScore | null>(null);

  useEffect(() => {
    fetch(`/api/library/${params.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setCard(data?.card ?? null));
    // A carried-over zoom level from the previous card would be jarring —
    // reset it on every navigation, whether via Prev/Next, arrow keys, or a
    // direct link, not just the explicit lightbox-open click handlers.
    setZoomed(false);
    setEbayListingCount(null);
    setHeat(null);
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

  async function togglePublic() {
    if (!card || togglingPublic) return;
    setTogglingPublic(true);
    try {
      const res = await fetch(`/api/library/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !card.isPublic }),
      });
      const data = await res.json();
      if (data.card) setCard(data.card);
    } finally {
      setTogglingPublic(false);
    }
  }

  async function handleImageChange(side: "front" | "back", e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !card) return;
    setImageError(null);
    setUploadingImage(side);
    try {
      const formData = new FormData();
      formData.append("side", side);
      formData.append("image", file);
      const res = await fetch(`/api/library/${card.id}/image`, { method: "PATCH", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not upload photo.");
      if (data.card) setCard(data.card);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Could not upload photo.");
    } finally {
      setUploadingImage(null);
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
    if (!confirmingDelete) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setConfirmingDelete(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmingDelete]);

  // While the lightbox is open, arrow keys toggle between THIS card's own
  // front/back images (only meaningful with a back image to toggle to) —
  // not navigation to a different card, which the second effect below
  // still handles once the lightbox is closed.
  useEffect(() => {
    if (!lightboxSide) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxSide(null);
      if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && card?.backImageUrl) {
        setLightboxSide((s) => (s === "front" ? "back" : "front"));
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxSide, card?.backImageUrl]);

  useEffect(() => {
    if (lightboxSide || !neighbors) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" && neighbors?.prevId) router.push(`/card/${neighbors.prevId}?sort=${sortBy}`);
      if (e.key === "ArrowRight" && neighbors?.nextId) router.push(`/card/${neighbors.nextId}?sort=${sortBy}`);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxSide, neighbors, sortBy, router]);

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

  const recentSales = [...card.sales].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5);
  const lightboxImage = lightboxSide === "front" ? card.imageUrl : lightboxSide === "back" ? card.backImageUrl : null;

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
                setLightboxSide("front");
              }
            }}
          >
            {card.imageUrl ? (
              <>
                <Image src={card.imageUrl} alt={card.player} fill className="object-cover" sizes="280px" unoptimized />
                <div className="absolute inset-0 hidden md:flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium bg-black/70 px-3 py-1.5 rounded-full">
                    🔍 Click to zoom
                  </span>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl">🃏</div>
            )}
            {isOwner && (
              <label
                onClick={(e) => e.stopPropagation()}
                className="absolute top-2 right-2 z-10 text-[10px] px-2 py-1 rounded-full bg-black/60 text-white border border-white/30 cursor-pointer hover:bg-black/80 transition-colors"
              >
                {uploadingImage === "front" ? "Uploading…" : "🔁 Replace"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageChange("front", e)}
                  disabled={uploadingImage !== null}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {card.backImageUrl ? (
            <div
              className="group relative aspect-[3/4] rounded-xl overflow-hidden border border-border bg-surface cursor-zoom-in mt-4"
              onClick={() => {
                setZoomed(false);
                setLightboxSide("back");
              }}
            >
              <Image src={card.backImageUrl} alt={`${card.player} (back)`} fill className="object-cover" sizes="280px" unoptimized />
              <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-black/60 text-white border border-white/30">
                Back
              </span>
              <div className="absolute inset-0 hidden md:flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium bg-black/70 px-3 py-1.5 rounded-full">
                  🔍 Click to zoom
                </span>
              </div>
              {isOwner && (
                <label
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-2 right-2 z-10 text-[10px] px-2 py-1 rounded-full bg-black/60 text-white border border-white/30 cursor-pointer hover:bg-black/80 transition-colors"
                >
                  {uploadingImage === "back" ? "Uploading…" : "🔁 Replace"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange("back", e)}
                    disabled={uploadingImage !== null}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          ) : (
            isOwner && (
              <label className="mt-4 flex items-center justify-center aspect-[3/4] rounded-xl border border-dashed border-border text-muted text-sm cursor-pointer hover:border-accent-2/40 hover:text-foreground transition-colors">
                {uploadingImage === "back" ? "Uploading…" : "+ Add back photo"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageChange("back", e)}
                  disabled={uploadingImage !== null}
                  className="hidden"
                />
              </label>
            )
          )}

          {imageError && <p className="text-xs text-down mt-2">{imageError}</p>}

          {isOwner && (
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
                onClick={togglePublic}
                disabled={togglingPublic}
                aria-label={card.isPublic ? "Make private (hide from public profile)" : "Make public"}
                title={card.isPublic ? "Public — visible on your public profile" : "Private — hidden from your public profile"}
                className="w-8 h-8 rounded-md border border-border text-muted hover:text-foreground hover:border-accent-2/40 transition-colors flex items-center justify-center disabled:opacity-50"
              >
                {card.isPublic ? "🌐" : "🔒"}
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
          <CardIdentityEditor card={card} canEdit={isOwner} onUpdate={setCard} heat={heat} />

          <ValuationCard
            valuation={card.valuation}
            cardId={card.id}
            onRefresh={setCard}
            canRefresh={isOwner}
            identifyNotes={card.identifyNotes}
          />

          <SetInfoCard identity={card} />

          <CardDescription
            identity={card}
            cardId={card.id}
            savedDescription={card.description}
            savedVoice={card.descriptionVoice}
            onUpdate={setCard}
            canEdit={isOwner}
          />

          {isOwner && <PurchaseInfo card={card} onUpdate={setCard} />}

          {card.trending && <TrendingCard trending={card.trending} />}

          {card.population ? (
            <PopulationCard population={card.population} />
          ) : (
            card.gradingCompany &&
            card.grade && <PopulationLinkOut gradingCompany={card.gradingCompany} certNumber={card.certNumber} />
          )}

          <EbayListings identity={card} onListingCountChange={setEbayListingCount} />

          <PlayerBuzz identity={card} listingCount={ebayListingCount} onHeatChange={setHeat} />

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

          <CommentThread apiBase={`/api/library/${card.id}/comments`} canModerate={isOwner} />

          <ShopSupplies />
        </div>
      </div>

      {confirmingDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
          onClick={() => !deleting && setConfirmingDelete(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-surface border border-border p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-4xl mb-2">🗑️</p>
            <h2 className="text-lg font-bold">Delete this card?</h2>
            <p className="text-sm text-muted mt-1">
              {card.player} — {[card.year, card.brand, card.setName].filter(Boolean).join(" ")}. This can&apos;t be
              undone.
            </p>
            <div className="mt-5 flex gap-2">
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
                className="flex-1 py-2 rounded-md bg-down text-white hover:opacity-90 transition-opacity text-sm disabled:opacity-40"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-6"
          onClick={() => setLightboxSide(null)}
        >
          <button
            onClick={() => setLightboxSide(null)}
            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-surface-2 text-foreground hover:bg-surface flex items-center justify-center text-lg"
            aria-label="Close"
          >
            ✕
          </button>
          {card.backImageUrl && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxSide((s) => (s === "front" ? "back" : "front"));
                }}
                aria-label={lightboxSide === "front" ? "Show back" : "Show front"}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-surface-2 text-foreground hover:bg-surface flex items-center justify-center text-xl"
              >
                ‹
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxSide((s) => (s === "front" ? "back" : "front"));
                }}
                aria-label={lightboxSide === "front" ? "Show back" : "Show front"}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-surface-2 text-foreground hover:bg-surface flex items-center justify-center text-xl"
              >
                ›
              </button>
            </>
          )}
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
          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-xs text-muted whitespace-nowrap">
            Click image to {zoomed ? "zoom out" : "zoom in"}
            {card.backImageUrl && " · ← → for front/back"} · Esc to close
          </p>
        </div>
      )}
    </div>
  );
}
