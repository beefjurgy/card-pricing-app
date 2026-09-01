import Link from "next/link";
import { Logo } from "./Logo";
import { CardTile } from "./CardTile";
import { LibraryCard } from "@/lib/types";

const PREVIEW_COUNT = 6;

// The logged-out state at "/" — distinct from the owner's own signed-in
// "My Collection" view and from any specific person's /u/[username]
// profile. Generic on purpose: it isn't tied to one collection, so it
// still makes sense once other people have their own profiles. The
// preview grid uses whatever `cards` the caller already fetched (the same
// public/redacted /api/library data the home page loads) rather than
// fetching its own copy or using fake sample data.
//
// Pulls from the owner's own Featured picks (same flag as the ⭐ toggle
// elsewhere) rather than a raw top-value sort across the whole library —
// that's the existing "these are the ones I want to show off" signal, and
// falls back to the full library if nothing's been starred yet. Deduped by
// player so one big name showing up twice doesn't crowd out variety.
export function LandingPage({ cards }: { cards: LibraryCard[] | null }) {
  const preview = (() => {
    if (!cards) return [];
    const pool = cards.some((c) => c.isFeatured) ? cards.filter((c) => c.isFeatured) : cards;
    const seenPlayers = new Set<string>();
    const deduped = [...pool]
      .sort((a, b) => b.valuation.estimate - a.valuation.estimate)
      .filter((c) => {
        if (seenPlayers.has(c.player)) return false;
        seenPlayers.add(c.player);
        return true;
      });
    return deduped.slice(0, PREVIEW_COUNT);
  })();

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-20 text-center">
      <div className="flex justify-center mb-6">
        <Logo size={48} />
      </div>
      <h1 className="text-3xl font-bold tracking-tight">Everything about your card collection in one place</h1>
      <p className="text-muted mt-4 leading-relaxed">
        Scan your cards, AI identifies them, prices them against live eBay listings, and gives you a shareable
        profile to brag about.
      </p>
      <Link
        href="/login"
        className="inline-block mt-8 px-6 py-3 rounded-md bg-accent-2 text-white font-medium hover:opacity-90 transition-opacity"
      >
        Sign in with Google
      </Link>

      {preview.length > 0 && (
        <div className="mt-16 text-left">
          <p className="text-xs uppercase tracking-wide text-muted mb-3">A peek at what&apos;s inside</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {preview.map((card) => (
              <CardTile key={card.id} card={card} disableLink />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-16 text-left sm:text-center">
        <div>
          <p className="font-medium">AI identification</p>
          <p className="text-muted text-sm mt-1">Snap a photo, get the full card details.</p>
        </div>
        <div>
          <p className="font-medium">Live valuations</p>
          <p className="text-muted text-sm mt-1">Priced against real eBay listings.</p>
        </div>
        <div>
          <p className="font-medium">Shareable profile</p>
          <p className="text-muted text-sm mt-1">A public page for your collection.</p>
        </div>
      </div>
    </div>
  );
}
