import "server-only";
import { Sport } from "./types";

// News is time-sensitive, unlike career totals — a much shorter TTL than
// careerStats.ts's 6-hour cache keeps this reasonably fresh without hitting
// these APIs (one undocumented, one rate-limited to 500/day) on every view.
const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, { value: PlayerBuzz; expiresAt: number }>();

export interface TrendingItem {
  source: "ESPN" | "NYT";
  headline: string;
  url: string;
  publishedDate: string | null;
}

// A simple mention-frequency score from ESPN coverage specifically (not
// NYT) — ESPN's per-athlete news feed is dense enough (video hits, fantasy
// mentions, beat-writer stories) for volume/recency to mean something;
// NYT's much sparser sports coverage would just show 0-1 almost always.
export interface EspnBuzzScore {
  label: "Trending" | "Active" | "Quiet";
  emoji: string;
  mentions7d: number;
  mentions30d: number;
}

export interface PlayerBuzz {
  items: TrendingItem[];
  espnBuzz: EspnBuzzScore | null;
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

function computeEspnBuzzScore(items: TrendingItem[]): EspnBuzzScore {
  const mentions7d = items.filter((i) => (daysAgo(i.publishedDate) ?? Infinity) <= 7).length;
  const mentions30d = items.filter((i) => (daysAgo(i.publishedDate) ?? Infinity) <= 30).length;

  if (mentions7d >= 3) return { label: "Trending", emoji: "🔥", mentions7d, mentions30d };
  if (mentions7d >= 1 || mentions30d >= 3) return { label: "Active", emoji: "📰", mentions7d, mentions30d };
  return { label: "Quiet", emoji: "➖", mentions7d, mentions30d };
}

// Same undocumented ESPN site API used for career stats — only NBA/NFL
// have this athlete-search + overview shape confirmed working; MLB/NHL/
// soccer players fall through to NYT-only below.
const ESPN_SPORT_LEAGUE: Partial<Record<Sport, { sport: string; league: string; leagueAbbrev: string }>> = {
  Basketball: { sport: "basketball", league: "nba", leagueAbbrev: "NBA" },
  Football: { sport: "football", league: "nfl", leagueAbbrev: "NFL" },
};

interface EspnNewsResult {
  items: TrendingItem[];
  buzz: EspnBuzzScore | null;
}

async function fetchEspnNews(player: string, sport: Sport): Promise<EspnNewsResult> {
  const config = ESPN_SPORT_LEAGUE[sport];
  if (!config) return { items: [], buzz: null };

  const search = (await fetchJson(
    `https://site.web.api.espn.com/apis/search/v2?query=${encodeURIComponent(player)}&sport=${config.sport}`
  )) as { results?: { contents?: { uid?: string; type?: string; sport?: string; description?: string }[] }[] } | null;
  const athleteUid = search?.results
    ?.flatMap((r) => r.contents ?? [])
    .find((c) => c.type === "player" && c.sport === config.sport && c.description === config.leagueAbbrev)?.uid;
  const athleteId = athleteUid?.match(/a:(\d+)/)?.[1];
  if (!athleteId) return { items: [], buzz: null };

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

  return { items: allItems.slice(0, 5), buzz: computeEspnBuzzScore(allItems) };
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

export async function getTrendingBuzz(player: string, sport: Sport): Promise<PlayerBuzz> {
  const key = `${sport}:${player.toLowerCase()}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const [espn, nyt] = await Promise.all([fetchEspnNews(player, sport), fetchNytNews(player)]);
  const items = [...espn.items, ...nyt].sort((a, b) => (b.publishedDate ?? "").localeCompare(a.publishedDate ?? ""));
  const value: PlayerBuzz = { items, espnBuzz: espn.buzz };

  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}
