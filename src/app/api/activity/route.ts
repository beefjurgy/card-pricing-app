import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getFollowingIds } from "@/lib/follows";
import { readActivityFeed } from "@/lib/library";
import { redactForViewer } from "@/lib/ownership";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const followedIds = await getFollowingIds(session.user.id);
  const items = await readActivityFeed(followedIds, 50);
  // readActivityFeed's card_added items embed the full card record — these
  // are always someone else's card (the feed is built from people you
  // follow), so purchase/sold price never belongs to this viewer and always
  // needs redacting, the same way every other cross-user card read does.
  const redacted = items.map((item) =>
    item.type === "card_added" ? { ...item, card: redactForViewer(item.card, session.user.id) } : item
  );
  return NextResponse.json({ items: redacted });
}
