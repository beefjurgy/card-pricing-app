import { NextRequest, NextResponse } from "next/server";
import { searchEbayListingsTiered } from "@/lib/ebay";
import { cardQuery, cardQueryBroad, cardQueryBroadest, cardQuerySplitCandidates } from "@/lib/platformLinks";
import { CardIdentity } from "@/lib/types";

export const runtime = "nodejs";

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
  const hasBroadMatches = result.listings.some((l) => !l.exactMatch);
  return NextResponse.json({ ...result, hasBroadMatches });
}
