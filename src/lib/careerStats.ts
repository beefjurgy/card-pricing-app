import "server-only";
import { CareerStats, Sport } from "./types";

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Same reasoning as the eBay OAuth token cache in ebay.ts: this is a single
// long-lived Node process, so a module-level cache is fine. Career totals
// change at most once a day (after a game), so a generous TTL avoids
// hammering these APIs — two of which are undocumented/unofficial — on every
// card view.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map<string, { value: CareerStats | null; expiresAt: number }>();

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; BeefyNukes/1.0)" } });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("Career stats fetch failed:", url, err);
    return null;
  }
}

// MLB Stats API — official, keyless. statsapi.mlb.com.
async function fetchMlbCareerStats(player: string): Promise<CareerStats | null> {
  const search = (await fetchJson(
    `https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(player)}`
  )) as { people?: { id: number; primaryPosition?: { abbreviation?: string } }[] } | null;
  const person = search?.people?.[0];
  if (!person) return null;

  const isPitcher = person.primaryPosition?.abbreviation === "P";
  const group = isPitcher ? "pitching" : "hitting";
  const stats = (await fetchJson(
    `https://statsapi.mlb.com/api/v1/people/${person.id}/stats?stats=career&group=${group}`
  )) as { stats?: { splits?: { stat?: Record<string, unknown> }[] }[] } | null;
  const line = stats?.stats?.[0]?.splits?.[0]?.stat;
  if (!line) return null;

  if (isPitcher) {
    if (!("wins" in line)) return null;
    return {
      lines: [
        { label: "W-L", value: `${line.wins}-${line.losses}` },
        { label: "ERA", value: String(line.era) },
        { label: "SO", value: String(line.strikeOuts) },
      ],
      asOf: "career, live",
    };
  }

  if (!("avg" in line)) return null;
  return {
    lines: [
      { label: "AVG", value: String(line.avg) },
      { label: "H", value: String(line.hits) },
      { label: "HR", value: String(line.homeRuns) },
      { label: "RBI", value: String(line.rbi) },
    ],
    asOf: "career, live",
  };
}

// NHL official API. Player search runs on a separate search subdomain from
// the stats API itself.
async function fetchNhlCareerStats(player: string): Promise<CareerStats | null> {
  const search = (await fetchJson(
    `https://search.d3.nhle.com/api/v1/search/player?culture=en-us&limit=5&q=${encodeURIComponent(player)}&active=true`
  )) as { playerId: number }[] | null;
  const playerId = search?.[0]?.playerId;
  if (!playerId) return null;

  const landing = (await fetchJson(`https://api-web.nhle.com/v1/player/${playerId}/landing`)) as {
    featuredStats?: { regularSeason?: { career?: Record<string, unknown> } };
  } | null;
  const career = landing?.featuredStats?.regularSeason?.career;
  if (!career || !("goals" in career)) return null;

  return {
    lines: [
      { label: "G", value: String(career.goals) },
      { label: "A", value: String(career.assists) },
      { label: "PTS", value: String(career.points) },
      { label: "GP", value: String(career.gamesPlayed) },
    ],
    asOf: "career, live",
  };
}

// ESPN's undocumented site API. Shared between NBA and NFL — only the
// sport/league path segments differ. Unofficial/reverse-engineered, so this
// is defensive about unexpected response shapes.
async function fetchEspnCareerStats(
  sport: "basketball" | "football",
  league: string,
  leagueAbbrev: string,
  player: string
): Promise<CareerStats | null> {
  const search = (await fetchJson(
    `https://site.web.api.espn.com/apis/search/v2?query=${encodeURIComponent(player)}&sport=${sport}`
  )) as { results?: { contents?: { uid?: string; type?: string; sport?: string; description?: string }[] }[] } | null;
  // uid encodes numeric sport/league/athlete ids (e.g. "s:20~l:28~a:3128429"),
  // not the league's string slug — filter on sport + the human-readable
  // league abbreviation ESPN puts in `description` instead (e.g. "NFL" vs.
  // "NCAAM" for a college player who shares the same name).
  const athleteUid = search?.results
    ?.flatMap((r) => r.contents ?? [])
    .find((c) => c.type === "player" && c.sport === sport && c.description === leagueAbbrev)?.uid;
  const athleteId = athleteUid?.match(/a:(\d+)/)?.[1];
  if (!athleteId) return null;

  const overview = (await fetchJson(
    `https://site.web.api.espn.com/apis/common/v3/sports/${sport}/${league}/athletes/${athleteId}/overview`
  )) as {
    statistics?: {
      // Values only — the labels live in a separate parallel array shared
      // across every split (Regular Season/Career/etc), not per-split.
      labels?: string[];
      categories?: { count: number }[];
      splits?: { displayName?: string; stats?: string[] }[];
    };
  } | null;
  const stats = overview?.statistics;
  const careerValues = stats?.splits?.find((s) => s.displayName === "Career")?.stats;
  if (!stats?.labels || !careerValues) return null;

  // NFL responses scope stats into position-dependent categories (receiving
  // vs. rushing vs. passing) with the player's primary one listed first; NBA
  // has no categories at all, just one flat stat line. Restrict to the first
  // category when present so a WR doesn't get padded out with irrelevant
  // passing/rushing columns.
  const range = stats.categories?.[0]?.count ?? stats.labels.length;
  const candidates = stats.labels
    .slice(0, range)
    .map((label, i) => ({ label, value: careerValues[i], index: i }))
    .filter((c) => c.value !== undefined && c.value !== "");
  if (!candidates.length) return null;

  const priority = ["PTS", "REB", "AST", "TD", "YDS", "REC", "CAR", "CMP", "ATT", "INT", "STL", "BLK", "GP"];
  const byPriority = (label: string) => {
    const i = priority.indexOf(label);
    return i === -1 ? priority.length : i;
  };
  const top = [...candidates].sort((a, b) => byPriority(a.label) - byPriority(b.label)).slice(0, 4);
  const inReadingOrder = top.sort((a, b) => a.index - b.index);

  return {
    lines: inReadingOrder.map((c) => ({ label: c.label, value: c.value })),
    asOf: "career, live",
  };
}

async function fetchLiveCareerStats(player: string, sport: Sport): Promise<CareerStats | null> {
  switch (sport) {
    case "Baseball":
      return fetchMlbCareerStats(player);
    case "Hockey":
      return fetchNhlCareerStats(player);
    case "Basketball":
      return fetchEspnCareerStats("basketball", "nba", "NBA", player);
    case "Football":
      return fetchEspnCareerStats("football", "nfl", "NFL", player);
    case "Soccer":
      // Not wired up yet — soccer careers span club + country across many
      // leagues/competitions, unlike a single closed league, so this needs
      // its own research pass (verify a real data source) rather than
      // reusing the NBA/NFL ESPN pattern as-is.
      return null;
    default:
      return null;
  }
}

export async function getCareerStats(player: string, sport: Sport): Promise<CareerStats | null> {
  const key = `${sport}:${normalize(player)}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const value = await fetchLiveCareerStats(player, sport);
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}
