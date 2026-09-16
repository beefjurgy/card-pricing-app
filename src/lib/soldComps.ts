import "server-only";
import { CardIdentity } from "./types";
import { cardQueryBroad } from "./platformLinks";

interface SaleRecord {
  title: string;
  price: number | null;
}

export interface SoldCompsResult {
  prices: number[];
  count: number;
}

function titleIndicatesAutograph(title: string): boolean {
  return /\bauto(?:s|graph(?:s|ed)?)?\b/i.test(title);
}

async function fetchSaleRecords(query: string, identity: CardIdentity): Promise<SaleRecord[]> {
  const apiKey = process.env.THE_CARD_API_KEY;
  if (!apiKey) {
    console.error("Sold comps: THE_CARD_API_KEY is not set in this environment.");
    return [];
  }
  try {
    // thecardapi.com's structured grader/grade/graded filters were broken
    // for eBay-sourced records for the first several weeks after we
    // integrated (grade/grader came back null even when a title plainly
    // stated one) — confirmed fixed live on 2026-09-16, so this now trusts
    // them directly instead of re-deriving grade/company from the raw
    // title ourselves. Autograph status still isn't one of their filters,
    // so that's the one thing still checked client-side below.
    //
    // The API's own `category=sports` filter is separately broken — still
    // confirmed broken as of 2026-09-16, returns zero results regardless
    // of value/casing even for an unambiguous query. Left off entirely;
    // `platform=ebay` alone is precise enough scoping for a
    // player/set/card-number query.
    const params = new URLSearchParams({ q: query, platform: "ebay", limit: "50" });
    const isGraded = Boolean(identity.gradingCompany && identity.grade);
    if (isGraded) {
      params.set("grader", identity.gradingCompany);
      params.set("grade", identity.grade);
    } else {
      params.set("graded", "false");
    }
    const url = `https://www.thecardapi.com/api/v1/market/sales?${params.toString()}`;
    const res = await fetch(url, { headers: { "x-market-api-key": apiKey } });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`Sold comps: request failed (${res.status} ${res.statusText}). Key length: ${apiKey.length}. Body: ${body.slice(0, 300)}`);
      return [];
    }
    const data = (await res.json()) as { data?: SaleRecord[] };
    return data.data ?? [];
  } catch (err) {
    console.error("Sold comps fetch failed:", err);
    return [];
  }
}

export async function getSoldComps(identity: CardIdentity): Promise<SoldCompsResult | null> {
  // cardQuery() (used for the eBay Browse API path) includes the card's
  // parallel name in the search text — for a plain "Base" card that meant
  // literally searching for the word "Base", which thecardapi.com's search
  // treats as a required term. Since real sellers rarely write "Base" in a
  // title, that collapsed real matches from 7 down to 1 for a live test
  // card (confirmed via a temporary debug route, 2026-09-10). cardQueryBroad
  // omits the parallel entirely — a better fit anyway, since the matching
  // below doesn't check parallel/print-run either.
  const records = await fetchSaleRecords(cardQueryBroad(identity), identity);
  if (records.length === 0) return null;

  const matched = records.filter((r) => titleIndicatesAutograph(r.title) === identity.isAutograph);

  const prices = matched.map((r) => r.price).filter((p): p is number => typeof p === "number" && p > 0);
  if (prices.length === 0) return null;

  return { prices, count: prices.length };
}
