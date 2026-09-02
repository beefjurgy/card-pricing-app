import { NextRequest, NextResponse } from "next/server";
import { getTrendingBuzz } from "@/lib/playerBuzz";
import { Sport } from "@/lib/types";

export async function POST(req: NextRequest) {
  const { player, sport, listingCount } = (await req.json()) as {
    player?: string;
    sport?: Sport;
    listingCount?: number | null;
  };
  if (!player || !sport) {
    return NextResponse.json({ error: "player and sport are required." }, { status: 400 });
  }

  const buzz = await getTrendingBuzz(player, sport, listingCount ?? null);
  return NextResponse.json(buzz);
}
