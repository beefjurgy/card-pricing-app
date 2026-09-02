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
    // The public profile always reflects what a real visitor sees, even
    // when the owner is viewing their own page — cards toggled off public
    // view are excluded here regardless of who's asking.
    cards: cards.filter((c) => c.isPublic).map((c) => redactForViewer(c, session?.user?.id)),
  });
}
