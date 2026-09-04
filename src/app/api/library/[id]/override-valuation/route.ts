import { NextRequest, NextResponse } from "next/server";
import { getCard, setValuationFields } from "@/lib/library";
import { auth } from "@/auth";

export const runtime = "nodejs";

// Lets the owner manually record a verified value from a real sold comp
// they found themselves (e.g. PSA's Auction Prices Realized) — the eBay
// Browse API this app otherwise relies on only sees active asking prices,
// never real sold prices, so this is the one path to a genuinely verified
// number, especially for graded cards where an off-grade asking price can
// badly mislead the automatic estimate. The resulting note carries the
// exact marker phrase isProtectedValuation checks for, so a later
// refresh-valuation call won't silently overwrite it.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to edit this card." }, { status: 401 });
  }

  const { id } = await params;
  const card = await getCard(id);
  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (card.userId !== session.user.id) {
    return NextResponse.json({ error: "You don't own this card." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { value?: number; source?: string };
  const value = body.value;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return NextResponse.json({ error: "Enter a valid positive value." }, { status: 400 });
  }
  const source = typeof body.source === "string" ? body.source.trim().slice(0, 200) : "";
  const rounded = Math.round(value);
  const formatted = rounded.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  const valuation = {
    estimate: rounded,
    low: rounded,
    high: rounded,
    trend: "flat" as const,
    trendPercent: 0,
    confidence: "high" as const,
    matchedComp: null,
    note: `Manually verified at ${formatted} — supplied directly by the collector from a real sold comp${source ? ` (${source})` : ""}.`,
  };

  const updated = await setValuationFields(id, {
    valuation,
    sales: card.sales,
    population: card.population,
    trending: card.trending,
  });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ card: updated });
}
