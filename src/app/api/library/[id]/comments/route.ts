import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { addCardComment, getCardComments } from "@/lib/comments";

const MAX_COMMENT_LENGTH = 1000;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const comments = await getCardComments(id);
  return NextResponse.json({ comments });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to comment." }, { status: 401 });
  }

  const { id } = await params;
  const { body } = (await req.json()) as { body?: string };
  const trimmed = body?.trim();
  if (!trimmed) {
    return NextResponse.json({ error: "Comment can't be empty." }, { status: 400 });
  }
  if (trimmed.length > MAX_COMMENT_LENGTH) {
    return NextResponse.json({ error: `Comment must be under ${MAX_COMMENT_LENGTH} characters.` }, { status: 400 });
  }

  const comment = await addCardComment(id, session.user.id, trimmed);
  return NextResponse.json({ comment });
}
