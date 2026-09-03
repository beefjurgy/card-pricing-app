import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { deleteComment, getCommentOwnership } from "@/lib/comments";
import { getUserByUsername } from "@/lib/users";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ username: string; commentId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { username, commentId } = await params;
  const [comment, profileUser] = await Promise.all([getCommentOwnership(commentId), getUserByUsername(username)]);
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Either the person who wrote the comment, or the profile's own owner
  // moderating their own wall, can remove it.
  const canDelete = comment.authorId === session.user.id || profileUser?.id === session.user.id;
  if (!canDelete) {
    return NextResponse.json({ error: "You can't delete this comment." }, { status: 403 });
  }

  await deleteComment(commentId);
  return NextResponse.json({ ok: true });
}
