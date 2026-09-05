import { NextRequest, NextResponse } from "next/server";
import { getCard, setCardImage } from "@/lib/library";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, imageKey, uploadImage, deleteImage } from "@/lib/storage";
import { auth } from "@/auth";

export const runtime = "nodejs";

// Lets the owner replace a card's front or back photo after it's already
// been added — e.g. a bad scan, better lighting the second time, or adding
// a back photo that wasn't captured originally. Old image is deleted from
// R2 only after the new upload succeeds, so a failed upload never leaves
// the card with no image.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to edit this card." }, { status: 401 });
  }

  const { id } = await params;
  const card = await getCard(id);
  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (card.userId !== session.user.id) {
    return NextResponse.json({ error: "You don't own this card." }, { status: 403 });
  }

  const formData = await req.formData();
  const side = formData.get("side");
  if (side !== "front" && side !== "back") {
    return NextResponse.json({ error: "side must be 'front' or 'back'." }, { status: 400 });
  }
  const file = formData.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing image file." }, { status: 400 });
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return NextResponse.json({ error: "That photo format isn't supported. Try a JPG, PNG, or WEBP." }, { status: 400 });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "That photo is too large. Please use one under 4MB." }, { status: 400 });
  }

  const previousUrl = side === "back" ? card.backImageUrl : card.imageUrl;
  const url = await uploadImage(file, imageKey(id, side === "back" ? "-back" : "", file.type));
  const updated = await setCardImage(id, side, url);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (previousUrl) await deleteImage(previousUrl);

  return NextResponse.json({ card: updated });
}
