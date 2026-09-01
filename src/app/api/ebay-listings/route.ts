import { NextRequest, NextResponse } from "next/server";
import { searchEbayListings, searchEbayListingsTiered } from "@/lib/ebay";
import { cardQuery, cardQueryBroad, cardQueryBroadest, cardQueryLastResort, cardQuerySplitCandidates } from "@/lib/platformLinks";
import { CardIdentity } from "@/lib/types";

export const runtime = "nodejs";

// Deliberately NOT gated behind auth, unlike the other eBay/Anthropic-backed
// routes — this is the sole backend for the "Current eBay Listings" section
// on the public card detail page (see EbayListings.tsx, its only caller),
// so a logged-out visitor needs to be able to call it too.
export async function POST(req: NextRequest) {
  const identity = (await req.json()) as CardIdentity;
  if (!identity?.player) {
    return NextResponse.json({ error: "Player name is required." }, { status: 400 });
  }

  const result = await searchEbayListingsTiered(
    cardQuery(identity),
    cardQueryBroad(identity),
    cardQueryBroadest(identity),
    10,
    cardQuerySplitCandidates(identity)
  );

  // Mirrors ebayPrices()'s own last-resort fallback in valuation.ts — without
  // this, a card whose valuation found real comps only via that loose query
  // would show "X listings found" in the estimate while this section (which
  // backs it) displayed nothing at all, since every tier above still
  // requires the set name to appear somewhere.
  if (result.configured && !result.error && result.listings.length === 0) {
    const loose = await searchEbayListings(cardQueryLastResort(identity), 10);
    if (loose.configured && !loose.error && loose.listings.length > 0) {
      const looseTagged = loose.listings.map((l) => ({ ...l, exactMatch: false }));
      return NextResponse.json({ ...result, listings: looseTagged, hasBroadMatches: true, looseMatch: true });
    }
  }

  const hasBroadMatches = result.listings.some((l) => !l.exactMatch);
  return NextResponse.json({ ...result, hasBroadMatches, looseMatch: false });
}
