import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCard } from "@/lib/library";
import { getFavoriteCardIds, setFavoriteCard } from "@/lib/users";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const favorites = await getFavoriteCardIds(session.user.id);
  return NextResponse.json({ favorites });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { slot, cardId } = (await req.json().catch(() => ({}))) as { slot?: number; cardId?: string | null };
  if (slot !== 1 && slot !== 2 && slot !== 3) {
    return NextResponse.json({ error: "slot must be 1, 2, or 3." }, { status: 400 });
  }
  if (cardId) {
    const card = await getCard(cardId);
    if (!card || card.userId !== session.user.id) {
      return NextResponse.json({ error: "You don't own this card." }, { status: 403 });
    }
  }

  await setFavoriteCard(session.user.id, slot, cardId ?? null);
  const favorites = await getFavoriteCardIds(session.user.id);
  return NextResponse.json({ favorites });
}
