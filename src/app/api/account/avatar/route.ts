import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { imageKey, uploadImage, deleteImage } from "@/lib/storage";
import { clearAvatarUrl, getAvatarUrl, setAvatarUrl } from "@/lib/users";

export const runtime = "nodejs";

// Browsers other than Safari can't decode HEIC in an <img> tag, so an
// iPhone/Photos-library picker file uploads "successfully" but never
// renders. Checked server-side too, not just client-side, since the
// client check is only a courtesy — this is the real gate.
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
// Comfortably under Vercel's ~4.5MB serverless function request body limit.
const MAX_BYTES = 4 * 1024 * 1024;

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing image file." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "That photo format isn't supported. Try a JPG, PNG, or WEBP." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "That photo is too large. Please use one under 4MB." }, { status: 400 });
  }

  // Only ever deletes a previously uploaded custom avatar (this column),
  // never the Google account photo — that one isn't ours to delete.
  const previous = await getAvatarUrl(session.user.id);
  const url = await uploadImage(file, imageKey(`avatar-${session.user.id}`, "", file.type));
  await setAvatarUrl(session.user.id, url);
  if (previous) await deleteImage(previous);

  return NextResponse.json({ avatarUrl: url });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const previous = await getAvatarUrl(session.user.id);
  await clearAvatarUrl(session.user.id);
  if (previous) await deleteImage(previous);

  return NextResponse.json({ ok: true });
}
