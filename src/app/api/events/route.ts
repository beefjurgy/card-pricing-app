import { NextResponse } from "next/server";
import { readUpcomingEvents } from "@/lib/events";

export async function GET() {
  const events = await readUpcomingEvents();
  return NextResponse.json({ events });
}
