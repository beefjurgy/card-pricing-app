import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getFavoriteCardIds, getUserByUsername } from "@/lib/users";
import { readLibraryForUser } from "@/lib/library";
import { redactForViewer } from "@/lib/ownership";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const user = await getUserByUsername(username);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const session = await auth();
  const cards = await readLibraryForUser(user.id);
  // The public profile always reflects what a real visitor sees, even
  // when the owner is viewing their own page — cards toggled off public
  // view are excluded here regardless of who's asking.
  const publicCards = cards.filter((c) => c.isPublic).map((c) => redactForViewer(c, session?.user?.id));

  // Resolved against the already-filtered public list rather than a
  // separate lookup — a favorited card that's since gone private or been
  // deleted just silently drops out, no extra handling needed.
  const favoriteIds = await getFavoriteCardIds(user.id);
  const favorites = favoriteIds.map((id) => (id ? publicCards.find((c) => c.id === id) ?? null : null));

  return NextResponse.json({ user, cards: publicCards, favorites });
}
