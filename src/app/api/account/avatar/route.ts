import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { imageKey, uploadImage, deleteImage } from "@/lib/storage";
import { getAvatarUrl, setAvatarUrl } from "@/lib/users";

export const runtime = "nodejs";

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

  // Only ever deletes a previously uploaded custom avatar (this column),
  // never the Google account photo — that one isn't ours to delete.
  const previous = await getAvatarUrl(session.user.id);
  const url = await uploadImage(file, imageKey(`avatar-${session.user.id}`, "", file.type));
  await setAvatarUrl(session.user.id, url);
  if (previous) await deleteImage(previous);

  return NextResponse.json({ avatarUrl: url });
}
