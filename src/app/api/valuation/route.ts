import { NextRequest, NextResponse } from "next/server";
import { getValuation } from "@/lib/valuation";
import { CardIdentity } from "@/lib/types";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const identity = (await req.json()) as CardIdentity;
  if (!identity?.player) {
    return NextResponse.json({ error: "Player name is required." }, { status: 400 });
  }
  const result = await getValuation(identity);
  return NextResponse.json(result);
}
