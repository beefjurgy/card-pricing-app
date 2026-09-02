import { NextRequest, NextResponse } from "next/server";
import { CardEvent, deleteStaleEvents, upsertEvents } from "@/lib/events";

export const runtime = "nodejs";

const KEYWORDS = ["card show", "trading card show"];

interface TicketmasterEvent {
  id: string;
  name: string;
  url?: string;
  dates: { start: { localDate?: string; dateTBD?: boolean; dateTBA?: boolean } };
  _embedded?: { venues?: { name?: string; city?: { name?: string }; state?: { stateCode?: string } }[] };
}

async function fetchTicketmaster(): Promise<CardEvent[]> {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) return [];

  const events = new Map<string, CardEvent>();
  for (const keyword of KEYWORDS) {
    const url = `https://app.ticketmaster.com/discovery/v2/events.json?${new URLSearchParams({
      keyword,
      countryCode: "US",
      // Real card shows are tagged under Ticketmaster's "Hobby" segment —
      // without this, a keyword match on "card show" also pulls in
      // unrelated events whose title happens to contain both words (e.g.
      // "Wild Card Comedy Show").
      classificationName: "Hobby",
      apikey: apiKey,
    })}`;
    const res = await fetch(url);
    if (!res.ok) continue;
    const data = (await res.json()) as { _embedded?: { events?: TicketmasterEvent[] } };
    for (const e of data._embedded?.events ?? []) {
      const start = e.dates.start;
      // A show without a confirmed date yet isn't useful on a calendar —
      // skip rather than show "Invalid Date".
      if (!start.localDate || start.dateTBD || start.dateTBA) continue;
      const venue = e._embedded?.venues?.[0];
      const id = `ticketmaster:${e.id}`;
      events.set(id, {
        id,
        source: "ticketmaster",
        name: e.name,
        startDate: start.localDate,
        city: venue?.city?.name ?? null,
        state: venue?.state?.stateCode ?? null,
        venue: venue?.name ?? null,
        url: e.url ?? null,
      });
    }
  }
  return [...events.values()];
}

interface SeatGeekEvent {
  id: number;
  title: string;
  datetime_local: string;
  url?: string;
  venue?: { name?: string; city?: string; state?: string };
}

async function fetchSeatGeek(): Promise<CardEvent[]> {
  const clientId = process.env.SEATGEEK_CLIENT_ID;
  if (!clientId) return [];

  const events = new Map<string, CardEvent>();
  for (const keyword of KEYWORDS) {
    const url = `https://api.seatgeek.com/2/events?${new URLSearchParams({ q: keyword, client_id: clientId })}`;
    const res = await fetch(url);
    if (!res.ok) continue;
    const data = (await res.json()) as { events?: SeatGeekEvent[] };
    for (const e of data.events ?? []) {
      if (!e.datetime_local) continue;
      const id = `seatgeek:${e.id}`;
      events.set(id, {
        id,
        source: "seatgeek",
        name: e.title,
        startDate: e.datetime_local.slice(0, 10),
        city: e.venue?.city ?? null,
        state: e.venue?.state ?? null,
        venue: e.venue?.name ?? null,
        url: e.url ?? null,
      });
    }
  }
  return [...events.values()];
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (new URL(req.url).searchParams.get("debug") === "1") {
    return NextResponse.json({
      hasSecret: Boolean(cronSecret),
      secretLength: cronSecret?.length ?? 0,
      hasAuthHeader: Boolean(authHeader),
      authHeaderLength: authHeader?.length ?? 0,
      matches: authHeader === `Bearer ${cronSecret}`,
    });
  }
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [ticketmaster, seatgeek] = await Promise.all([fetchTicketmaster(), fetchSeatGeek()]);

  await upsertEvents([...ticketmaster, ...seatgeek]);
  await deleteStaleEvents("ticketmaster", ticketmaster.map((e) => e.id));
  await deleteStaleEvents("seatgeek", seatgeek.map((e) => e.id));

  return NextResponse.json({ ticketmaster: ticketmaster.length, seatgeek: seatgeek.length });
}
