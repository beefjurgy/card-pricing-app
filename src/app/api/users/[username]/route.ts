import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserByUsername } from "@/lib/users";
import { readLibraryForUser } from "@/lib/library";
import { redactForViewer } from "@/lib/ownership";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const user = await getUserByUsername(username);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const session = await auth();
  const cards = await readLibraryForUser(user.id);
  return NextResponse.json({
    user,
    cards: cards.map((c) => redactForViewer(c, session?.user?.id)),
  });
}
