import { NextRequest, NextResponse } from "next/server";
import { getValuation } from "@/lib/valuation";
import { CardIdentity } from "@/lib/types";

export async function POST(req: NextRequest) {
  const identity = (await req.json()) as CardIdentity;
  if (!identity?.player) {
    return NextResponse.json({ error: "Player name is required." }, { status: 400 });
  }
  const result = await getValuation(identity);
  return NextResponse.json(result);
}
