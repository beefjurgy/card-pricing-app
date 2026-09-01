import { NextRequest, NextResponse } from "next/server";
import { deleteCard, getCard, updateCard } from "@/lib/library";
import { LibraryCard } from "@/lib/types";
import { auth } from "@/auth";
import { redactForViewer } from "@/lib/ownership";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const card = await getCard(id);
  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ card: redactForViewer(card, session?.user?.id) });
}

// Purchase info, the isFeatured toggle, the generated description, and now
// the identity fields (player/set/parallel/grading/etc., via the in-app
// editor) are all editable after a card's been added. Valuation and images
// still only ever come from the scan flow or the refresh-valuation route —
// this stays a fixed allowlist rather than a generic dynamic-column UPDATE
// so an identity edit can never accidentally overwrite those.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to edit this card." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await req.json()) as {
    purchasePrice?: number | null;
    purchaseDate?: string | null;
    purchasePlatform?: string | null;
    isFeatured?: boolean;
    description?: string | null;
    descriptionVoice?: LibraryCard["descriptionVoice"];
    player?: string;
    sport?: LibraryCard["sport"];
    year?: string;
    brand?: string;
    setName?: string;
    cardNumber?: string;
    parallel?: string;
    gradingCompany?: string;
    grade?: string;
    certNumber?: string;
    isAutograph?: boolean;
    autographCompany?: string;
    autographGrade?: string;
    identifyNotes?: string;
  };

  const patch: Record<string, unknown> = {};
  if ("purchasePrice" in body) {
    patch.purchasePrice = typeof body.purchasePrice === "number" && !Number.isNaN(body.purchasePrice) ? body.purchasePrice : null;
  }
  if ("purchaseDate" in body) patch.purchaseDate = body.purchaseDate || null;
  if ("purchasePlatform" in body) patch.purchasePlatform = body.purchasePlatform || null;
  if ("isFeatured" in body) patch.isFeatured = Boolean(body.isFeatured);
  if ("description" in body) patch.description = body.description || null;
  if ("descriptionVoice" in body) patch.descriptionVoice = body.descriptionVoice || null;
  if ("player" in body) patch.player = body.player;
  if ("sport" in body) patch.sport = body.sport;
  if ("year" in body) patch.year = body.year;
  if ("brand" in body) patch.brand = body.brand;
  if ("setName" in body) patch.setName = body.setName;
  if ("cardNumber" in body) patch.cardNumber = body.cardNumber;
  if ("parallel" in body) patch.parallel = body.parallel;
  if ("gradingCompany" in body) patch.gradingCompany = body.gradingCompany;
  if ("grade" in body) patch.grade = body.grade;
  if ("certNumber" in body) patch.certNumber = body.certNumber;
  if ("isAutograph" in body) patch.isAutograph = Boolean(body.isAutograph);
  if ("autographCompany" in body) patch.autographCompany = body.autographCompany;
  if ("autographGrade" in body) patch.autographGrade = body.autographGrade;
  if ("identifyNotes" in body) patch.identifyNotes = body.identifyNotes || "";

  const card = await updateCard(id, patch);
  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ card });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to delete this card." }, { status: 401 });
  }

  const { id } = await params;
  const ok = await deleteCard(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
