import { NextRequest, NextResponse } from "next/server";
import { getCard, setValuationFields } from "@/lib/library";
import { getValuation } from "@/lib/valuation";

export const runtime = "nodejs";

// Recomputes a card's valuation server-side from its own stored identity —
// the client only ever triggers this, never supplies the numbers, so a
// stale estimate (market moved, or a matching bug got fixed) can be
// refreshed without trusting any client-provided valuation data.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { valuation, sales, population, trending } = await getValuation(card);
  const updated = await setValuationFields(id, { valuation, sales, population, trending });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ card: updated });
}
