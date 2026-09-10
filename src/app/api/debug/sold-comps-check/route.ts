import { NextRequest, NextResponse } from "next/server";
import { getCard } from "@/lib/library";
import { getSoldComps } from "@/lib/soldComps";
import { cardQuery } from "@/lib/platformLinks";

// Temporary diagnostic route — no auth, but leaks nothing sensitive (key
// length only, never the value itself; card data here is already public
// read-shaped). Exists purely to debug why the sold-comps feature never
// fires in production without going through Vercel's log UI each time.
// Delete once the real cause is found.
export async function GET(req: NextRequest) {
  const apiKey = process.env.THE_CARD_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, reason: "THE_CARD_API_KEY is not set." });
  }

  const cardId = req.nextUrl.searchParams.get("cardId");
  if (!cardId) {
    const url = "https://www.thecardapi.com/api/v1/market/sales?q=Michael+Jordan&platform=ebay&limit=3";
    const res = await fetch(url, { headers: { "x-market-api-key": apiKey } });
    const body = await res.text();
    return NextResponse.json({ ok: res.ok, status: res.status, keyLength: apiKey.length, bodyPreview: body.slice(0, 300) });
  }

  const card = await getCard(cardId);
  if (!card) return NextResponse.json({ ok: false, reason: "Card not found." });

  const query = cardQuery(card);
  const result = await getSoldComps(card);

  return NextResponse.json({
    ok: true,
    identity: {
      player: card.player,
      year: card.year,
      brand: card.brand,
      setName: card.setName,
      cardNumber: card.cardNumber,
      gradingCompany: card.gradingCompany,
      grade: card.grade,
      isAutograph: card.isAutograph,
    },
    queryUsed: query,
    soldCompsResult: result,
  });
}
