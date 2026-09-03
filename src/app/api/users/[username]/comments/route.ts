import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { addProfileComment, getProfileComments } from "@/lib/comments";
import { getUserByUsername } from "@/lib/users";

const MAX_COMMENT_LENGTH = 1000;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const user = await getUserByUsername(username);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const comments = await getProfileComments(user.id);
  return NextResponse.json({ comments });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to comment." }, { status: 401 });
  }

  const { username } = await params;
  const user = await getUserByUsername(username);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { body } = (await req.json()) as { body?: string };
  const trimmed = body?.trim();
  if (!trimmed) {
    return NextResponse.json({ error: "Comment can't be empty." }, { status: 400 });
  }
  if (trimmed.length > MAX_COMMENT_LENGTH) {
    return NextResponse.json({ error: `Comment must be under ${MAX_COMMENT_LENGTH} characters.` }, { status: 400 });
  }

  const comment = await addProfileComment(user.id, session.user.id, trimmed);
  return NextResponse.json({ comment });
}
