import "server-only";
import { Sport } from "./types";

// News is time-sensitive, unlike career totals — a much shorter TTL than
// careerStats.ts's 6-hour cache keeps this reasonably fresh without hitting
// these APIs (one undocumented, one rate-limited to 500/day) on every view.
// Only the ESPN/NYT fetch results are cached here — listing count is
// per-request (passed in from the caller, who already has it from the
// same eBay search the listings section makes) and combined into the
// heat score fresh each call, so a changed listing count never needs a
// wasted re-fetch of news that hasn't changed.
const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, { value: CachedBuzz; expiresAt: number }>();

export interface TrendingItem {
  source: "ESPN" | "NYT";
  headline: string;
  url: string;
  publishedDate: string | null;
}

interface CachedBuzz {
  items: TrendingItem[];
  mentions7d: number;
  mentions30d: number;
}

// Combines ESPN mention frequency with how many active eBay listings exist
// for this specific card — media buzz alone can be noisy (a single video
// clip counts the same as a big trade story), so real market interest
// (people actually listing copies for sale) has to line up too for the
// hottest label.
export interface HeatScore {
  label: "High Buzz" | "Rising Buzz" | "Low Buzz";
  emoji: string;
  mentions7d: number;
  mentions30d: number;
  listingCount: number | null;
}

export interface PlayerBuzz {
  items: TrendingItem[];
  heat: HeatScore | null;
}

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; CardNukes/1.0)" } });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("Trending fetch failed:", url, err);
    return null;
  }
}

function daysAgo(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const ms = Date.now() - new Date(dateStr).getTime();
  return ms / (24 * 60 * 60 * 1000);
}

// Fire only when both signals back each other up; a single strong signal
// (lots of news, no real listings — or vice versa) tops out at "Rising Buzz".
function computeHeatScore(mentions7d: number, mentions30d: number, listingCount: number | null): HeatScore {
  const hasListingSignal = listingCount !== null && listingCount >= 10;
  const hasMentionSignal = mentions7d >= 3;

  if (hasMentionSignal && hasListingSignal) {
    return { label: "High Buzz", emoji: "🔥", mentions7d, mentions30d, listingCount };
  }
  if (hasMentionSignal || mentions30d >= 3 || (listingCount !== null && listingCount >= 5)) {
    return { label: "Rising Buzz", emoji: "📈", mentions7d, mentions30d, listingCount };
  }
  return { label: "Low Buzz", emoji: "📉", mentions7d, mentions30d, listingCount };
}

// Same undocumented ESPN site API used for career stats — confirmed
// working for all four here (real per-player news items, verified via
// direct curl for each league). Soccer has no single ESPN league the way
// the others do (it spans many competitions), so it falls through to
// NYT-only below, same reasoning as careerStats.ts's soccer handling.
const ESPN_SPORT_LEAGUE: Partial<Record<Sport, { sport: string; league: string; leagueAbbrev: string }>> = {
  Basketball: { sport: "basketball", league: "nba", leagueAbbrev: "NBA" },
  Football: { sport: "football", league: "nfl", leagueAbbrev: "NFL" },
  Baseball: { sport: "baseball", league: "mlb", leagueAbbrev: "MLB" },
  Hockey: { sport: "hockey", league: "nhl", leagueAbbrev: "NHL" },
};

interface EspnNewsResult {
  items: TrendingItem[];
  mentions7d: number;
  mentions30d: number;
}

async function fetchEspnNews(player: string, sport: Sport): Promise<EspnNewsResult> {
  const config = ESPN_SPORT_LEAGUE[sport];
  if (!config) return { items: [], mentions7d: 0, mentions30d: 0 };

  const search = (await fetchJson(
    `https://site.web.api.espn.com/apis/search/v2?query=${encodeURIComponent(player)}&sport=${config.sport}`
  )) as { results?: { contents?: { uid?: string; type?: string; sport?: string; description?: string }[] }[] } | null;
  const athleteUid = search?.results
    ?.flatMap((r) => r.contents ?? [])
    .find((c) => c.type === "player" && c.sport === config.sport && c.description === config.leagueAbbrev)?.uid;
  const athleteId = athleteUid?.match(/a:(\d+)/)?.[1];
  if (!athleteId) return { items: [], mentions7d: 0, mentions30d: 0 };

  const overview = (await fetchJson(
    `https://site.web.api.espn.com/apis/common/v3/sports/${config.sport}/${config.league}/athletes/${athleteId}/overview`
  )) as { news?: { headline?: string; lastModified?: string; links?: { web?: { href?: string } } }[] } | null;

  // Score against every mention ESPN returns, not just the handful shown —
  // the display list is capped separately below.
  const allItems: TrendingItem[] = (overview?.news ?? [])
    .map((item) => ({
      source: "ESPN" as const,
      headline: item.headline ?? "",
      url: item.links?.web?.href ?? "",
      publishedDate: item.lastModified ?? null,
    }))
    .filter((item) => item.headline && item.url);

  return {
    items: allItems.slice(0, 5),
    mentions7d: allItems.filter((i) => (daysAgo(i.publishedDate) ?? Infinity) <= 7).length,
    mentions30d: allItems.filter((i) => (daysAgo(i.publishedDate) ?? Infinity) <= 30).length,
  };
}

// NYT's Article Search API — official, free (500 requests/day), needs a
// key from developer.nytimes.com. Works for any player regardless of
// sport, unlike the ESPN path above.
async function fetchNytNews(player: string): Promise<TrendingItem[]> {
  const apiKey = process.env.NYT_API_KEY;
  if (!apiKey) return [];

  // No news_desk/section filter — verified live that NYT's sports coverage
  // isn't reliably tagged news_desk:"Sports" (confirmed empirically: even
  // an unambiguous query like "NFL" returns zero hits filtered that way).
  // A distinctive full player name is specific enough on its own.
  const data = (await fetchJson(
    `https://api.nytimes.com/svc/search/v2/articlesearch.json?${new URLSearchParams({
      q: player,
      sort: "newest",
      "api-key": apiKey,
    })}`
  )) as { response?: { docs?: { headline?: { main?: string }; web_url?: string; pub_date?: string }[] } } | null;

  return (data?.response?.docs ?? [])
    .slice(0, 5)
    .map((doc) => ({
      source: "NYT" as const,
      headline: doc.headline?.main ?? "",
      url: doc.web_url ?? "",
      publishedDate: doc.pub_date ?? null,
    }))
    .filter((item) => item.headline && item.url);
}

async function getCachedBuzz(player: string, sport: Sport): Promise<CachedBuzz> {
  const key = `${sport}:${player.toLowerCase()}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const [espn, nyt] = await Promise.all([fetchEspnNews(player, sport), fetchNytNews(player)]);
  const items = [...espn.items, ...nyt].sort((a, b) => (b.publishedDate ?? "").localeCompare(a.publishedDate ?? ""));
  const value: CachedBuzz = { items, mentions7d: espn.mentions7d, mentions30d: espn.mentions30d };

  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

export async function getTrendingBuzz(player: string, sport: Sport, listingCount: number | null): Promise<PlayerBuzz> {
  const { items, mentions7d, mentions30d } = await getCachedBuzz(player, sport);
  return { items, heat: computeHeatScore(mentions7d, mentions30d, listingCount) };
}
