import { NextRequest, NextResponse } from "next/server";
import { getSetInfo } from "@/lib/setInfo";

// Public, unauthenticated — same convention as /api/trending, since this is
// generic informational content about a set, not anything owner-specific.
export async function POST(req: NextRequest) {
  const { year, brand, setName, sport } = (await req.json().catch(() => ({}))) as {
    year?: string;
    brand?: string;
    setName?: string;
    sport?: string;
  };
  if (!year || !brand || !setName) {
    return NextResponse.json({ error: "year, brand, and setName are required." }, { status: 400 });
  }

  const info = await getSetInfo(year, brand, setName, sport ?? "");
  return NextResponse.json({ blurb: info?.blurb ?? null });
}
