import { NextRequest, NextResponse } from "next/server";
import { deleteCard, getCard, updateCard } from "@/lib/library";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ card });
}

// Only purchase info and the isFeatured toggle are editable after a card's
// been added — everything else (identity, valuation, images) comes from the
// scan flow. Keeping the patch surface narrow avoids this becoming a way to
// silently rewrite the card's AI-identified fields or valuation out from
// under the rest of the app.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as {
    purchasePrice?: number | null;
    purchaseDate?: string | null;
    purchasePlatform?: string | null;
    isFeatured?: boolean;
  };

  const patch: Record<string, unknown> = {};
  if ("purchasePrice" in body) {
    patch.purchasePrice = typeof body.purchasePrice === "number" && !Number.isNaN(body.purchasePrice) ? body.purchasePrice : null;
  }
  if ("purchaseDate" in body) patch.purchaseDate = body.purchaseDate || null;
  if ("purchasePlatform" in body) patch.purchasePlatform = body.purchasePlatform || null;
  if ("isFeatured" in body) patch.isFeatured = Boolean(body.isFeatured);

  const card = await updateCard(id, patch);
  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ card });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = await deleteCard(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
