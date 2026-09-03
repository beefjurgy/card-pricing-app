import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCardReactionSummary, ReactionType, toggleCardReaction } from "@/lib/reactions";

const VALID_REACTIONS: ReactionType[] = ["heart", "thumbs_up"];

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const summary = await getCardReactionSummary(id, session?.user?.id);
  return NextResponse.json(summary);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to react." }, { status: 401 });
  }

  const { id } = await params;
  const { reaction } = (await req.json()) as { reaction?: ReactionType };
  if (!reaction || !VALID_REACTIONS.includes(reaction)) {
    return NextResponse.json({ error: "Invalid reaction." }, { status: 400 });
  }

  await toggleCardReaction(id, session.user.id, reaction);
  const summary = await getCardReactionSummary(id, session.user.id);
  return NextResponse.json(summary);
}
