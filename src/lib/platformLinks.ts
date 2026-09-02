import { CardIdentity } from "./types";
import { getEbayAffiliateUrl } from "./affiliateLinks";

// otherDetails is deliberately excluded — it's a free-form personal note
// (e.g. "Color Match"), not a distinguishing search term, and mixing it into
// the query would risk affecting the valuation estimate. It's informational
// only: shown on the card page and included in AI descriptions, never fed
// into eBay search or comp matching.
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
// A setName joined with " / " (spaces required — this must not fire on a
// tight slash like "2022/23" or "Chrome/Blaster Edition", which are single
// tokens, not two candidate names) means the identification step recorded
// two names for the same insert: a parent product name and a more
// marketable subset name — e.g. "Rookie Exclusives / Preps to the Pros" or
// "Future Force / 1992-93 Upper Deck". Which side sellers actually title
// listings after varies card to card (sometimes the subset name comes
// first, sometimes second), so rather than guessing, this returns one
// broadest-tier query per side and lets both compete for real matches.
export function cardQuerySplitCandidates(card: QueryFields): string[] {
  const parts = card.setName.split(/\s+\/\s+/).map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1) return [];
  return parts.map((part) =>
    [card.year, card.brand, part, card.cardNumber && `#${card.cardNumber}`, card.player].filter(Boolean).join(" ")
  );
}

// The absolute last resort — drops the set name entirely, keeping only
// year/brand/card number/player. Every other query above still requires the
// set name (or one of its split-name candidates) to appear in a listing;
// this is what finds a real comp when a set is so obscure, new, or
// inconsistently named that no seller's title ever includes it at all.
export function cardQueryLastResort(card: QueryFields): string {
  return [card.year, card.brand, card.cardNumber && `#${card.cardNumber}`, card.player].filter(Boolean).join(" ");
}

export function cardQueryBroadest(card: QueryFields): string | null {
  // A "/"-joined setName is handled by cardQuerySplitCandidates above, which
  // tries each real candidate name on its own. Falling through to this
  // function's plain first-word split instead would take the first word of
  // the WHOLE combined string (e.g. "Rookie" out of "Rookie Exclusives /
  // Preps to the Pros") — a query so loose ("Rookie" + card number + player)
  // that it pulled in entirely different same-numbered inserts from the same
  // release ("Phenomenal Beginning", "Lebron's Diary") as if they were the
  // same product, once the split candidates started finding real matches.
  if (/\s+\/\s+/.test(card.setName)) return null;
  const setWords = card.setName.trim().split(/\s+/).filter(Boolean);
  if (setWords.length <= 1) return null;
  return [card.year, card.brand, setWords[0], card.cardNumber && `#${card.cardNumber}`, card.player]
    .filter(Boolean)
    .join(" ");
}

// A site:tcdb.com-scoped search (the original approach here) guarantees a
// dead end — a blank "no results" page — for any set TCDB hasn't indexed
// yet, which happens often for brand-new releases and niche/non-sport
// products. Dropping the site restriction means Google can surface TCDB
// when it has the set, or any other real checklist/set-info page when it
// doesn't, instead of a guaranteed empty result. Uses the broad query (no
// parallel) since that's the set-level info being looked for, plus a
// "checklist" keyword to bias results toward set-info pages specifically.
export function getSetInfoUrl(card: QueryFields): string {
  const query = `${cardQueryBroad(card)} checklist`;
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
    return getEbayAffiliateUrl(`https://www.ebay.com/sch/i.html?${params.toString()}`);
  }

  const domain = SITE_DOMAINS[platform];
  const searchText = domain ? `site:${domain} ${query}` : `${platform} ${query}`;
  return `https://www.google.com/search?q=${encodeURIComponent(searchText)}`;
}
