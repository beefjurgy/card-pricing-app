import "server-only";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export interface CardEvent {
  id: string;
  source: string;
  name: string;
  startDate: string;
  city: string | null;
  state: string | null;
  venue: string | null;
  url: string | null;
}

interface EventRow {
  id: string;
  source: string;
  name: string;
  start_date: string;
  city: string | null;
  state: string | null;
  venue: string | null;
  url: string | null;
}

function rowToEvent(row: EventRow): CardEvent {
  return {
    id: row.id,
    source: row.source,
    name: row.name,
    startDate: row.start_date,
    city: row.city,
    state: row.state,
    venue: row.venue,
    url: row.url,
  };
}

export async function readUpcomingEvents(): Promise<CardEvent[]> {
  const rows = (await sql`
    SELECT * FROM events WHERE start_date >= CURRENT_DATE ORDER BY start_date ASC
  `) as EventRow[];
  return rows.map(rowToEvent);
}

// One row per event, keyed by "<source>:<external id>" so re-running the
// sync updates an existing listing (date/venue changes) instead of
// duplicating it. Manual entries (flagship shows that don't ticket through
// Ticketmaster/SeatGeek) use "manual:<slug>" as their id.
export async function upsertEvents(events: CardEvent[]): Promise<void> {
  for (const e of events) {
    await sql`
      INSERT INTO events (id, source, name, start_date, city, state, venue, url)
      VALUES (${e.id}, ${e.source}, ${e.name}, ${e.startDate}, ${e.city}, ${e.state}, ${e.venue}, ${e.url})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        start_date = EXCLUDED.start_date,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        venue = EXCLUDED.venue,
        url = EXCLUDED.url
    `;
  }
}

// Drops events from a source that weren't in this sync's results — e.g. a
// show that got cancelled or aged out of the platform's own listings.
// Manual entries and other sources are untouched.
export async function deleteStaleEvents(source: string, keepIds: string[]): Promise<void> {
  if (keepIds.length === 0) {
    await sql`DELETE FROM events WHERE source = ${source}`;
    return;
  }
  await sql`DELETE FROM events WHERE source = ${source} AND id NOT IN (SELECT unnest(${keepIds}::text[]))`;
}
