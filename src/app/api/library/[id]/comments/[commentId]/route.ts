import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { deleteComment, getCommentOwnership } from "@/lib/comments";
import { getCard } from "@/lib/library";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id, commentId } = await params;
  const [comment, card] = await Promise.all([getCommentOwnership(commentId), getCard(id)]);
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Either the person who wrote the comment, or the card's own owner
  // moderating their own card, can remove it.
  const canDelete = comment.authorId === session.user.id || card?.userId === session.user.id;
  if (!canDelete) {
    return NextResponse.json({ error: "You can't delete this comment." }, { status: 403 });
  }

  await deleteComment(commentId);
  return NextResponse.json({ ok: true });
}
