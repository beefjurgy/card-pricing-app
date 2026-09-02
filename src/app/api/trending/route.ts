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

  if (new URL(req.url).searchParams.get("debug") === "1") {
    const apiKey = process.env.NYT_API_KEY;
    const url = `https://api.nytimes.com/svc/search/v2/articlesearch.json?${new URLSearchParams({
      q: player,
      fq: 'news_desk:("Sports")',
      sort: "newest",
      "api-key": apiKey ?? "",
    })}`;
    const res = await fetch(url);
    const body = await res.text();
    return NextResponse.json({
      hasKey: Boolean(apiKey),
      keyLength: apiKey?.length ?? 0,
      status: res.status,
      body: body.slice(0, 500),
    });
  }

  const buzz = await getTrendingBuzz(player, sport, listingCount ?? null);
  return NextResponse.json(buzz);
}
