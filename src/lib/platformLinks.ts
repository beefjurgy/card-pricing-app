import { CardIdentity } from "./types";

export type QueryFields = Pick<CardIdentity, "player" | "year" | "brand" | "setName" | "cardNumber" | "parallel">;

export function cardQuery(card: QueryFields): string {
  return [card.year, card.brand, card.setName, card.cardNumber && `#${card.cardNumber}`, card.player, card.parallel]
    .filter(Boolean)
    .join(" ");
}

// Parallel/variant names are the least reliable part of a search query —
// sellers describe the same print run inconsistently (e.g. "Wave Refractor"
// vs "Raywave" for what's actually the same parallel), so a query that
// includes it can miss real listings a looser query would find. This drops
// it and keeps only the fields that reliably identify "the same base card"
// (year/brand/set/card number/player), which stay consistent across sellers.
export function cardQueryBroad(card: QueryFields): string {
  return [card.year, card.brand, card.setName, card.cardNumber && `#${card.cardNumber}`, card.player]
    .filter(Boolean)
    .join(" ");
}

// eBay's search behaves like an AND across query words rather than pure
// relevance ranking — a query this long can still come up nearly empty when
// the set name itself is a multi-word compound (e.g. "Gilded Collection
// Chrome") that sellers abbreviate inconsistently ("Gilded Collection" /
// "Chrome Gilded" / just "Gilded"), never using the full three-word name.
// Trimming to the set name's first word alone matches how sellers actually
// title these listings. Returns null when setName is already one word, since
// that's identical to cardQueryBroad and not worth a third API call.
export function cardQueryBroadest(card: QueryFields): string | null {
  const setWords = card.setName.trim().split(/\s+/).filter(Boolean);
  if (setWords.length <= 1) return null;
  return [card.year, card.brand, setWords[0], card.cardNumber && `#${card.cardNumber}`, card.player]
    .filter(Boolean)
    .join(" ");
}

// Trading Card Database (tcdb.com) — a community-maintained checklist
// database covering nearly every sports/trading card set ever released,
// far more complete than manufacturer sites (which rarely keep release
// info around for older or niche products). Its own search form isn't
// reliable enough to deep-link into directly, so this scopes a normal web
// search to the site instead, same pattern as the SITE_DOMAINS fallback
// below. Uses the broad query (no parallel) since that's the set-level
// info TCDB actually organizes by.
export function getSetInfoUrl(card: QueryFields): string {
  const query = `site:tcdb.com ${cardQueryBroad(card)}`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

// Domains we're confident enough in to scope a search to, for platforms whose
// own internal search URL format isn't reliable enough to link to directly.
const SITE_DOMAINS: Record<string, string> = {
  PWCC: "pwccmarketplace.com",
  Goldin: "goldin.co",
  "Heritage Auctions": "sports.ha.com",
};

/**
 * Best-effort link to where you could search for comps on the given platform.
 * eBay's sold-listings search URL is stable enough to link to directly; for
 * everything else we fall back to a site-scoped web search rather than
 * guessing at an internal search endpoint that may not exist.
 */
export function getPlatformSearchUrl(platform: string, card: QueryFields): string {
  const query = cardQuery(card);

  if (platform === "eBay") {
    const params = new URLSearchParams({ _nkw: query, LH_Sold: "1", LH_Complete: "1" });
    return `https://www.ebay.com/sch/i.html?${params.toString()}`;
  }

  const domain = SITE_DOMAINS[platform];
  const searchText = domain ? `site:${domain} ${query}` : `${platform} ${query}`;
  return `https://www.google.com/search?q=${encodeURIComponent(searchText)}`;
}
