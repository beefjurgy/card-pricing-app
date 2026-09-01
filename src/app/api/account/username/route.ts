import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { setUsername } from "@/lib/users";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { username } = (await req.json()) as { username?: string };
  if (!username || typeof username !== "string") {
    return NextResponse.json({ error: "Username is required." }, { status: 400 });
  }

  try {
    await setUsername(session.user.id, username);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update username.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ username: username.toLowerCase() });
}
