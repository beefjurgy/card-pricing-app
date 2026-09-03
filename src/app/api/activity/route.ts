import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getFollowingIds } from "@/lib/follows";
import { readActivityFeed } from "@/lib/library";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const followedIds = await getFollowingIds(session.user.id);
  const items = await readActivityFeed(followedIds, 50);
  return NextResponse.json({ items });
}
