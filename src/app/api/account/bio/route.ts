import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { BIO_MAX_LENGTH, getBio, setBio } from "@/lib/users";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const bio = await getBio(session.user.id);
  return NextResponse.json({ bio });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { bio } = (await req.json()) as { bio?: string };
  if (typeof bio !== "string") {
    return NextResponse.json({ error: "Bio is required." }, { status: 400 });
  }
  if (bio.trim().length > BIO_MAX_LENGTH) {
    return NextResponse.json({ error: `Bio must be ${BIO_MAX_LENGTH} characters or fewer.` }, { status: 400 });
  }

  const saved = await setBio(session.user.id, bio);
  return NextResponse.json({ bio: saved });
}
