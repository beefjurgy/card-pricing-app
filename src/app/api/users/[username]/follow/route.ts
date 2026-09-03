import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { followUser, getFollowCounts, isFollowing, unfollowUser } from "@/lib/follows";
import { getUserByUsername } from "@/lib/users";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const user = await getUserByUsername(username);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const session = await auth();
  const [counts, following] = await Promise.all([
    getFollowCounts(user.id),
    session?.user?.id ? isFollowing(session.user.id, user.id) : Promise.resolve(false),
  ]);
  return NextResponse.json({ ...counts, following });
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
  return NextResponse.json({ ...counts, following: true });
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
  return NextResponse.json({ ...counts, following: false });
}
