import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { followUser, getFollowCounts, isFollowing, unfollowUser } from "@/lib/follows";
import { getUserByUsername } from "@/lib/users";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const user = await getUserByUsername(username);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const session = await auth();
  const [counts, viewerIsFollowing] = await Promise.all([
    getFollowCounts(user.id),
    session?.user?.id ? isFollowing(session.user.id, user.id) : Promise.resolve(false),
  ]);
  // Bug fix: this used to spread `counts` (followers, following as numbers)
  // and then name the viewer's own follow-state boolean `following` too —
  // silently overwriting the real following COUNT with a true/false value
  // before it ever reached the client. Nothing read the clobbered value
  // yet, so harmless so far, but real once something (the profile stats
  // row) actually needs the count.
  return NextResponse.json({ ...counts, isFollowing: viewerIsFollowing });
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to follow." }, { status: 401 });
  }

  const { username } = await params;
  const user = await getUserByUsername(username);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await followUser(session.user.id, user.id);
  const counts = await getFollowCounts(user.id);
  return NextResponse.json({ ...counts, isFollowing: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { username } = await params;
  const user = await getUserByUsername(username);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await unfollowUser(session.user.id, user.id);
  const counts = await getFollowCounts(user.id);
  return NextResponse.json({ ...counts, isFollowing: false });
}
