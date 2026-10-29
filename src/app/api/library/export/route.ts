import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { readLibraryForUser } from "@/lib/library";
import { buildCardsCsv } from "@/lib/csvExport";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const cards = await readLibraryForUser(session.user.id);
  const csv = buildCardsCsv(cards, req.nextUrl.origin);
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="card-nukes-export-${date}.csv"`,
    },
  });
}
