import "server-only";
import { Sport } from "./types";

// News is time-sensitive, unlike career totals — a much shorter TTL than
// careerStats.ts's 6-hour cache keeps this reasonably fresh without hitting
// these APIs (one undocumented, one rate-limited to 500/day) on every view.
const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, { value: TrendingItem[]; expiresAt: number }>();

export interface TrendingItem {
  source: "ESPN" | "NYT";
  headline: string;
  url: string;
  publishedDate: string | null;
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

// Same undocumented ESPN site API used for career stats — only NBA/NFL
// have this athlete-search + overview shape confirmed working; MLB/NHL/
// soccer players fall through to NYT-only below.
const ESPN_SPORT_LEAGUE: Partial<Record<Sport, { sport: string; league: string; leagueAbbrev: string }>> = {
  Basketball: { sport: "basketball", league: "nba", leagueAbbrev: "NBA" },
  Football: { sport: "football", league: "nfl", leagueAbbrev: "NFL" },
};

async function fetchEspnNews(player: string, sport: Sport): Promise<TrendingItem[]> {
  const config = ESPN_SPORT_LEAGUE[sport];
  if (!config) return [];

  const search = (await fetchJson(
    `https://site.web.api.espn.com/apis/search/v2?query=${encodeURIComponent(player)}&sport=${config.sport}`
  )) as { results?: { contents?: { uid?: string; type?: string; sport?: string; description?: string }[] }[] } | null;
  const athleteUid = search?.results
    ?.flatMap((r) => r.contents ?? [])
    .find((c) => c.type === "player" && c.sport === config.sport && c.description === config.leagueAbbrev)?.uid;
  const athleteId = athleteUid?.match(/a:(\d+)/)?.[1];
  if (!athleteId) return [];

  const overview = (await fetchJson(
    `https://site.web.api.espn.com/apis/common/v3/sports/${config.sport}/${config.league}/athletes/${athleteId}/overview`
  )) as { news?: { headline?: string; lastModified?: string; links?: { web?: { href?: string } } }[] } | null;

  return (overview?.news ?? [])
    .slice(0, 5)
    .map((item) => ({
      source: "ESPN" as const,
      headline: item.headline ?? "",
      url: item.links?.web?.href ?? "",
      publishedDate: item.lastModified ?? null,
    }))
    .filter((item) => item.headline && item.url);
}

// NYT's Article Search API — official, free (500 requests/day), needs a
// key from developer.nytimes.com. Works for any player regardless of
// sport, unlike the ESPN path above.
async function fetchNytNews(player: string): Promise<TrendingItem[]> {
  const apiKey = process.env.NYT_API_KEY;
  if (!apiKey) return [];

  const data = (await fetchJson(
    `https://api.nytimes.com/svc/search/v2/articlesearch.json?${new URLSearchParams({
      q: player,
      fq: 'news_desk:("Sports")',
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

export async function getTrendingBuzz(player: string, sport: Sport): Promise<TrendingItem[]> {
  const key = `${sport}:${player.toLowerCase()}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const [espn, nyt] = await Promise.all([fetchEspnNews(player, sport), fetchNytNews(player)]);
  const combined = [...espn, ...nyt].sort((a, b) => (b.publishedDate ?? "").localeCompare(a.publishedDate ?? ""));

  cache.set(key, { value: combined, expiresAt: Date.now() + CACHE_TTL_MS });
  return combined;
}
