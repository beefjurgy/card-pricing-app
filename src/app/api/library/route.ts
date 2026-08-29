import { NextRequest, NextResponse } from "next/server";
import { addCard, readLibrary } from "@/lib/library";
import { imageKey, uploadImage } from "@/lib/storage";
import { getValuation } from "@/lib/valuation";
import { CardIdentity, LibraryCard } from "@/lib/types";

export const runtime = "nodejs";

async function saveUpload(file: File, id: string, suffix: string): Promise<string> {
  return uploadImage(file, imageKey(id, suffix, file.type));
}

export async function GET() {
  const cards = await readLibrary();
  return NextResponse.json({ cards });
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("image");
  const backFile = formData.get("backImage");
  const identityRaw = formData.get("identity");
  const confidence = (formData.get("identifyConfidence") as string) || "medium";
  const identifyNotes = (formData.get("identifyNotes") as string) || "";
  const purchasePriceRaw = formData.get("purchasePrice") as string | null;
  const purchasePrice = purchasePriceRaw && !Number.isNaN(Number(purchasePriceRaw)) ? Number(purchasePriceRaw) : null;
  const purchaseDate = (formData.get("purchaseDate") as string | null) || null;
  const purchasePlatform = (formData.get("purchasePlatform") as string | null) || null;

  if (!identityRaw || typeof identityRaw !== "string") {
    return NextResponse.json({ error: "Missing card identity." }, { status: 400 });
  }
  const identity = JSON.parse(identityRaw) as CardIdentity;
  if (!identity.player) {
    return NextResponse.json({ error: "Player name is required." }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const imageUrl = file instanceof File ? await saveUpload(file, id, "") : "";
  const backImageUrl = backFile instanceof File ? await saveUpload(backFile, id, "-back") : null;

  const { valuation, sales, population, trending } = await getValuation(identity);

  const card: LibraryCard = {
    ...identity,
    id,
    imageUrl,
    backImageUrl,
    dateAdded: new Date().toISOString(),
    identifyConfidence: confidence as LibraryCard["identifyConfidence"],
    identifyNotes,
    valuation,
    sales,
    population,
    trending,
    purchasePrice,
    purchaseDate,
    purchasePlatform,
  };

  await addCard(card);
  return NextResponse.json({ card });
}
