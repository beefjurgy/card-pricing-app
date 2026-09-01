import { MARKET_DATABASE } from "./mockSales";
import { CardIdentity, MarketEntry, Population, Sale, TrendingSignal, Valuation } from "./types";
import { computeTrending } from "./trending";
import { getCareerStats } from "./careerStats";
import { searchEbayListings, searchEbayListingsTiered, TieredEbayListing } from "./ebay";
import { cardQuery, cardQueryBroad, cardQueryBroadest, cardQuerySplitCandidates } from "./platformLinks";

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// eBay's search is loose full-text matching, so a handful of results are
// often a different parallel/product entirely (e.g. a $125 graded card
// mixed in with $1-2 raw commons). Raw min/max is one bad match away from a
// nonsensical range; the interquartile range is far more robust to that
// while still being built only from real prices, not a fabricated spread.
function interquartileRange(values: number[]): { low: number; high: number } {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (p: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))))];
  return { low: at(0.25), high: at(0.75) };
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Player name alone is never enough to call two cards "the same comp" — a
// player can have dozens of cards across years/sets at wildly different
// values. A match must also be corroborated by at least one field that
// actually distinguishes one specific card from another (year, card number,
// or set name); brand/sport alone are too coarse (e.g. "Topps" and
// "Baseball" apply to hundreds of a player's cards).
function scoreMatch(identity: CardIdentity, entry: MarketEntry): { score: number; distinguishing: number } {
  const player = normalize(identity.player);
  const entryPlayer = normalize(entry.player);
  if (!player) return { score: 0, distinguishing: 0 };

  let playerScore = 0;
  if (entryPlayer === player) playerScore = 60;
  else if (entryPlayer.includes(player) || player.includes(entryPlayer)) playerScore = 35;
  else return { score: 0, distinguishing: 0 }; // player is the required anchor field

  // An autographed card and its base (non-auto) counterpart are different
  // products at very different values, even with the same year/set/number —
  // never treat one as a comp for the other.
  if (identity.isAutograph !== entry.isAutograph) return { score: 0, distinguishing: 0 };

  // A year mismatch, when both are known, is a hard disqualifier. Without
  // this, a real 1990 Fleer card could match the mock database's 1986 Fleer
  // rookie comp purely because both happen to have setName "Fleer" (a very
  // common pattern — many brands reuse their own name as the set name across
  // many different years) — a completely different, wildly different-value
  // card. Card number/set name alone should never override an explicit year
  // disagreement.
  if (identity.year && entry.year && identity.year !== entry.year) return { score: 0, distinguishing: 0 };

  // Year match alone is NOT distinguishing enough to accept a match — a
  // player can have many different cards (different set, different card
  // number) in the very same year, and year+brand+sport was previously
  // enough on its own to pass the acceptance threshold below. That let two
  // completely different Brock Purdy rookie cards (2022 Panini Chronicles
  // "Panini Base" #PA-19 and Chronicles Photogenic #PH-36, both raw) both
  // get matched to an unrelated mock entry — 2022 Panini PRIZM #343, SGC
  // 10 graded — purely because the year matched, even though the card
  // number and set name were both known and both clearly disagreed. Year
  // still counts toward the score for ranking among real candidates, but
  // only a card-number or set-name match counts as genuine distinguishing
  // corroboration.
  let distinguishing = 0;
  if (identity.cardNumber && entry.cardNumber && normalize(identity.cardNumber) === normalize(entry.cardNumber)) {
    distinguishing += 15;
  }
  if (identity.setName && entry.setName && normalize(identity.setName).includes(normalize(entry.setName))) {
    distinguishing += 10;
  }

  let weakScore = 0;
  if (identity.year && identity.year === entry.year) weakScore += 15;
  if (identity.brand && normalize(identity.brand) === normalize(entry.brand)) weakScore += 10;
  if (identity.sport && identity.sport === entry.sport) weakScore += 5;

  return { score: playerScore + distinguishing + weakScore, distinguishing };
}

function findBestMatch(identity: CardIdentity): MarketEntry | null {
  let best: MarketEntry | null = null;
  let bestScore = 0;
  for (const entry of MARKET_DATABASE) {
    const { score, distinguishing } = scoreMatch(identity, entry);
    // Require real corroboration beyond the player's name (year, card
    // number, or set) — otherwise any card by the same player would match.
    if (distinguishing > 0 && score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  return bestScore >= 60 ? best : null;
}

function weightedEstimate(sales: Sale[]): { estimate: number; low: number; high: number } {
  const sorted = [...sales].sort((a, b) => (a.date < b.date ? 1 : -1)); // newest first
  const n = sorted.length;
  let weightSum = 0;
  let valueSum = 0;
  sorted.forEach((sale, i) => {
    const weight = n - i; // most recent gets highest weight
    weightSum += weight;
    valueSum += weight * sale.price;
  });
  const estimate = Math.round(valueSum / weightSum);
  const prices = sorted.map((s) => s.price);
  const recentPrices = prices.slice(0, Math.min(3, n));
  const low = Math.round(Math.min(...recentPrices) * 0.97);
  const high = Math.round(Math.max(...recentPrices) * 1.03);
  return { estimate, low, high };
}

function computeTrend(sales: Sale[]): { trend: "up" | "down" | "flat"; trendPercent: number } {
  const sorted = [...sales].sort((a, b) => (a.date < b.date ? -1 : 1)); // oldest first
  if (sorted.length < 2) return { trend: "flat", trendPercent: 0 };
  const mid = Math.floor(sorted.length / 2);
  const older = sorted.slice(0, mid || 1);
  const recent = sorted.slice(mid);
  const avg = (arr: Sale[]) => arr.reduce((sum, s) => sum + s.price, 0) / arr.length;
  const olderAvg = avg(older);
  const recentAvg = avg(recent);
  const pct = ((recentAvg - olderAvg) / olderAvg) * 100;
  if (Math.abs(pct) < 2) return { trend: "flat", trendPercent: Math.round(pct * 10) / 10 };
  return { trend: pct > 0 ? "up" : "down", trendPercent: Math.round(pct * 10) / 10 };
}

const SPORT_BASELINE: Record<string, number> = {
  Baseball: 45,
  Basketball: 55,
  Football: 40,
  Hockey: 35,
  Soccer: 40,
  Other: 25,
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// eBay's Browse API only buckets condition as "Graded" vs. not — it never
// exposes the actual grade or company. For vintage/rookie cards especially, a
// PSA 9 and a PSA 7 (or a different company's grade entirely) of the same
// base card can differ 10x+ in price, so "Graded" alone isn't precise enough
// to build a median from. Titles usually spell the grade out in free text
// (sellers want buyers to see it), so check for the company+grade together as
// a best-effort signal — e.g. "PSA 9" matches, but not "PSA 9.5" or "BGS 9".
function titleMatchesExactGrade(title: string, gradingCompany: string, grade: string): boolean {
  const company = escapeRegExp(gradingCompany.trim());
  const gradeValue = escapeRegExp(grade.trim());
  if (!company || !gradeValue) return false;
  const pattern = new RegExp(`${company}\\D{0,15}\\b${gradeValue}\\b(?!\\.\\d)`, "i");
  return pattern.test(title);
}

// The set of grading companies we ever expect a title to name explicitly —
// used to detect when a listing confirms a DIFFERENT company than the user's
// card (e.g. a title says "BGS" when the card is PSA). That's a strong,
// specific disqualifying signal, unlike a different *grade number* from the
// SAME company — a real PSA 9 listing is still a useful reference point for a
// PSA 10 of the identical parallel/print-run, just an imperfect one.
const KNOWN_GRADING_COMPANIES = ["PSA", "BGS", "SGC", "CGC", "CCG", "BGG", "PGS", "FCGS"];

function titleMentionsCompany(title: string, company: string): boolean {
  return new RegExp(`\\b${escapeRegExp(company.trim())}\\b`, "i").test(title);
}

function titleMentionsAnyOtherCompany(title: string, company: string): boolean {
  const upper = company.trim().toUpperCase();
  return KNOWN_GRADING_COMPANIES.some((candidate) => candidate !== upper && titleMentionsCompany(title, candidate));
}

// Serial-numbered parallels print "x/y" (e.g. "38/75") directly on the card,
// and sellers reliably carry the "/y" run size into listing titles even when
// they describe the parallel name itself totally differently (e.g. "Wave
// Gold Etch" vs "Mini Diamond Gold Etch" can both be real parallels of the
// same product with different, unrelated print runs). Unlike parallel names,
// this number is unambiguous, so it's a reliable signal even from free text.
// Excludes a "2025/26"-style season/year range, which reads identically to a
// print run ("/26") but isn't one — the negative lookbehind skips any slash
// immediately preceded by a "20YY" year.
function extractPrintRun(text: string): number | null {
  const m = text.match(/(?<!20\d{2})\/(\d{1,4})\b/);
  return m ? parseInt(m[1], 10) : null;
}

// The part of a parallel's name that isn't the print run itself, e.g. "Gold"
// out of "Gold /10". Used to tell a genuinely unnumbered listing (seller just
// omitted "/10") apart from a listing of the plain base/unnumbered version of
// the same insert — a completely different, far more common and far cheaper
// product than a low-numbered parallel.
function extractParallelName(parallel: string): string {
  return parallel.replace(/\/\d{1,4}\b/, "").trim();
}

// Words so generic to a product line (often implied rather than stated —
// "Prizm"/"Refractor" describe the whole product, not one specific parallel
// within it) that requiring them would create false negatives against real
// sellers who drop them, without adding any real specificity of their own.
// The memorabilia/swatch terms belong here for the same reason but a
// different cause: sellers describe the exact same physical feature with
// wildly different words ("Memorabilia", "Jersey", "Jerseys", "MEM",
// "Patch", "Swatch", "Player-Worn") — requiring the identity's specific
// choice of word verbatim (e.g. "Memorabilia") failed every single real
// listing for a card, none of which happened to use that literal word.
const GENERIC_PARALLEL_WORDS = new Set([
  "prizm",
  "refractor",
  "parallel",
  "insert",
  "base",
  "memorabilia",
  "jersey",
  "jerseys",
  "mem",
  "patch",
  "swatch",
  "relic",
  "threads",
  // "Card"/"RC" are universal rookie-card boilerplate, not a distinguishing
  // parallel name — a plain "Rookie" identity was failing real listings
  // titled "... Rookie Card ..." or "... Rookie RC ..." (i.e. almost all of
  // them) purely because the word right after "Rookie" wasn't itself one of
  // the words already recognized as generic.
  "card",
  "rc",
]);

// A bare substring check isn't enough — many products have several distinct
// parallels that all start with the same base color/name, at very different
// values (e.g. "Green", "Green Disco", "Green Shimmer" are three different
// parallels of the same insert). For a single distinguishing word, a genuine
// match ends there — the card number, a print run, punctuation, or the end
// of the title comes next, not another qualifying word (this is exactly how
// a real $20 "Aspirations Green /399" listing once got diluted down to $4 by
// "Green Disco" listings that shared nothing with it but the word "Green").
// For a multi-word name (e.g. "Blue Hyper Prizm"), requiring every
// non-generic word to appear as its own whole word is specific enough on its
// own — a genuinely different parallel won't happen to contain all of them —
// while tolerating a seller who drops a redundant trailing word like "Prizm"
// (this is exactly how "Blue Hyper" without "Prizm" was originally missed).
function titleMentionsParallelName(title: string, parallelName: string): boolean {
  const words = parallelName
    .split(/\s+/)
    .map((w) => w.trim())
    // Strip leading/trailing punctuation the AI identification step
    // sometimes attaches as an annotation style — e.g. "Base Rookie (Rainbow
    // Foil)" leaves the literal "(" and ")" stuck to "Rainbow"/"Foil)". A
    // \b...\b check on "Foil)" requires that literal closing paren in the
    // title, which no real eBay listing ever has, so this silently rejected
    // every one of 12 real listings for a real card down to a modeled guess
    // ($36 instead of the real ~$1-2 market). Internal punctuation (a
    // hyphen in "X-Fractor", an apostrophe) is left alone — only the outer
    // edges of each word are trimmed.
    .map((w) => w.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, ""))
    // A standalone punctuation token (e.g. "&" out of "Home & Away") can
    // never satisfy a \b...\b word-boundary check on its own — both of its
    // neighbors are typically non-word characters (spaces) too, so the
    // boundary the regex looks for never occurs. Requiring it anyway meant
    // every listing for a real "Home & Away Memorabilia" card failed this
    // check regardless of content, silently zeroing out real comps down to
    // a modeled guess ($45 instead of the real ~$5 market).
    .filter((w) => w && /[a-z0-9]/i.test(w) && !GENERIC_PARALLEL_WORDS.has(w.toLowerCase()));
  // Every word was punctuation or generic (e.g. a plain "Base" parallel, or
  // "Prizm" alone) — there's nothing left that actually distinguishes this
  // parallel from any other, which is the same situation as having no
  // parallel name at all. Treating that as a non-match instead silently
  // failed every real listing for any plain "Base" card (one of the most
  // common parallel values in the whole library) the moment its valuation
  // was refreshed, dropping it to a much less accurate modeled guess.
  if (words.length === 0) return true;

  if (words.length === 1) {
    // The word immediately after the match matters: a genuinely different
    // sibling parallel ("Green" vs "Green Disco") disqualifies the match,
    // but real listings almost always pair a color/style word with its own
    // product-line suffix ("Mojo Prizm", "Wave Refractor") — and that suffix
    // is exactly the generic word this function already stripped out of the
    // identity's own parallel name. Rejecting a match just because THAT word
    // follows meant a real "MOJO Prizm ... SSP" listing (Prizm being
    // generic) failed to match an identity of plain "Mojo Prizm", the same
    // way "Rookie Card"/"Rookie RC" fails a plain "Rookie" identity — a
    // single remaining word is disqualified only by a genuinely different,
    // non-generic word right after it, not by any word at all.
    const regex = new RegExp(`\\b${escapeRegExp(words[0])}\\b(\\s+([a-zA-Z]+))?`, "gi");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(title))) {
      const nextWord = match[2];
      if (!nextWord || GENERIC_PARALLEL_WORDS.has(nextWord.toLowerCase())) return true;
    }
    return false;
  }
  return words.every((w) => new RegExp(`\\b${escapeRegExp(w)}\\b`, "i").test(title));
}

// Unlike print run or set name, sellers ALWAYS call out an autograph in the
// title when one is present — it's one of the biggest value drivers on a
// card, never something worth omitting. So treat this as a strict signal in
// both directions: a listing that mentions "auto" for a non-auto card is a
// mismatch (this is exactly how a $550 "Auto 10" listing once got averaged
// in as a comp for a plain non-autographed Bo Jackson rookie), and a listing
// that says nothing about an autograph for a card that IS autographed is
// almost certainly a different (much cheaper) base/non-auto version.
function titleIndicatesAutograph(title: string): boolean {
  return /\bauto(?:s|graph(?:s|ed)?)?\b/i.test(title);
}

function titleAutographMismatch(title: string, isAutograph: boolean): boolean {
  return titleIndicatesAutograph(title) !== isAutograph;
}

// Shared by both the normal tiered search and the last-resort loose search
// below — same identity-corroboration rules apply regardless of how the
// listings were found, so a loose query can't skip the checks that keep a
// completely different product from being averaged in as a comp.
function extractPricesFromListings(
  identity: CardIdentity,
  listings: TieredEbayListing[]
): { prices: number[]; broadMatch: boolean } {
  // Drop listings that explicitly claim a different print run than this
  // card's — a /50 parallel and a /75 parallel are different products even
  // when both share words like "Gold Etch". A listing that doesn't mention a
  // run at all is only given the benefit of the doubt (seller omitted it) if
  // it at least names the parallel itself (e.g. "Gold") — a numbered
  // parallel's plain unnumbered base version is a real, different, much
  // cheaper product, and just never mentioning a run is exactly how it looks
  // identical to "seller omitted the run" (this is exactly how a real /10
  // Roger Clemens Gold parallel at $60 once got buried under a handful of
  // $1-2 base "Dominators" insert listings that named no parallel at all).
  //
  // Critically, the parallel-name check below runs whenever there IS a
  // parallel name — not only when the card also happens to be numbered. A
  // card like "Blue Hyper Prizm" (no print run at all) still names a
  // specific parallel distinct from siblings like "Pandora" or "Neon Green
  // Prizm" in the very same insert set, at wildly different values; gating
  // the name check behind "only if numbered" let exactly that kind of card
  // get diluted by every other named parallel of the same insert.
  const identityRun = extractPrintRun(identity.parallel);
  const parallelName = extractParallelName(identity.parallel);
  const runMatched = listings.filter((l) => {
    const listingRun = extractPrintRun(l.title);

    // Both sides claim an explicit run — that's the most reliable signal
    // available, so let it decide regardless of any naming differences.
    if (identityRun !== null && listingRun !== null) {
      return listingRun === identityRun;
    }

    // The card has no print run at all, but this listing claims one — that's
    // a real, separately-numbered sub-parallel of the same product line, not
    // just a different description of the same card. This matters most when
    // the identity's "parallel" is actually the whole edition's name (e.g.
    // "Sapphire" for a Topps Chrome Sapphire Edition base card, the same way
    // "Prizm" names a whole Panini product line) — nearly every listing in
    // that edition mentions that word, including a numbered "Gold /50"
    // insert that's a wildly different, much rarer card. A $450 Messi "Gold
    // 23/50" listing once got averaged in as a comp for a plain unnumbered
    // Sapphire base card purely because both listings said "Sapphire".
    if (identityRun === null && listingRun !== null) {
      return false;
    }

    if (identityRun !== null || parallelName) {
      // No name to check against — this only happens for a bare numbered
      // parallel with no color/style name at all (e.g. "/50"); keep the
      // same benefit-of-the-doubt as the run-only case above.
      if (!parallelName) return true;
      return titleMentionsParallelName(l.title, parallelName);
    }

    // A plain "Base" identity with no run and no distinguishing name — no
    // parallel to corroborate, so nothing here disqualifies a listing.
    return true;
  });

  // Drop listings whose autograph status contradicts the card's — an
  // autographed insert and its non-auto base counterpart are wildly
  // different products, and unlike print run or parallel name, sellers never
  // omit "auto" from a title when a card actually has one.
  const autoMatched = runMatched.filter((l) => !titleAutographMismatch(l.title, identity.isAutograph));

  // A graded card (e.g. PSA 10) and a raw copy of the same card are different
  // products, often 10-30x apart in price for modern cards — eBay's search
  // returns both indiscriminately, and for a low-value base card the raw
  // listings vastly outnumber graded ones. Mixing them would badly skew the
  // median toward whichever side has more listings, so only count listings
  // on the same side of that line as the user's own card.
  const isGraded = Boolean(identity.gradingCompany && identity.grade);
  const sameGradedBucket = autoMatched.filter((l) => (l.condition === "Graded") === isGraded);

  // Within "graded", pick the best available tier of evidence rather than
  // averaging everything in the bucket together or discarding real signal
  // too aggressively. In order of preference:
  //   1. Exact company+grade match (e.g. "PSA 10") — the real thing.
  //   2. Same company, different grade (e.g. real "PSA 9" ask for a PSA 10
  //      card), but only from the exact-tier query — confirms it's actually
  //      this card's specific parallel, just an imperfect grade match.
  //   3. Same company, different grade, from the broader tiers — weaker
  //      (parallel isn't confirmed) but still same-company signal.
  //   4. No company/grade mentioned at all, but exact-tier confirmed — the
  //      parallel is right, grade is just unstated.
  // A listing that names a DIFFERENT company (e.g. "BGS" on a PSA card) is
  // dropped outright at every tier — cross-company grades aren't comparable.
  // A broad-tier listing with no grade mentioned at all is dropped too — that
  // combination is how two listings for entirely different, much rarer
  // parallels ("Purple Power Prizm /49", "Color Blast") once got averaged in
  // as a comp for a plain "Green Prizm" card, since neither one contradicted
  // anything, they just were never confirmed to be the right card either.
  let matching = sameGradedBucket;
  if (isGraded) {
    const safe = sameGradedBucket.filter((l) => !titleMentionsAnyOtherCompany(l.title, identity.gradingCompany));
    const exact = safe.filter((l) => titleMatchesExactGrade(l.title, identity.gradingCompany, identity.grade));
    const sameCompanyExactTier = safe.filter((l) => l.exactMatch && titleMentionsCompany(l.title, identity.gradingCompany));
    const sameCompanyAnyTier = safe.filter((l) => titleMentionsCompany(l.title, identity.gradingCompany));
    const ambiguousExactTier = safe.filter((l) => l.exactMatch);

    matching =
      exact.length > 0
        ? exact
        : sameCompanyExactTier.length > 0
        ? sameCompanyExactTier
        : sameCompanyAnyTier.length > 0
        ? sameCompanyAnyTier
        : ambiguousExactTier;
  }

  const prices = matching.map((l) => l.price).filter((p): p is number => p !== null && p > 0);
  const broadMatch = matching.some((l) => !l.exactMatch);
  return { prices, broadMatch };
}

async function ebayPrices(
  identity: CardIdentity
): Promise<{ prices: number[]; broadMatch: boolean; looseMatch: boolean }> {
  // Sellers describe parallels/variants inconsistently (e.g. "Wave Refractor"
  // vs "Raywave" for the same print run), so an exact-text search alone can
  // miss real listings of the same base card even when it finds something.
  // Always merge in the broader same-base-card search rather than only
  // falling back to it when the exact query comes up completely empty.
  const result = await searchEbayListingsTiered(
    cardQuery(identity),
    cardQueryBroad(identity),
    cardQueryBroadest(identity),
    10,
    cardQuerySplitCandidates(identity)
  );
  const primary = extractPricesFromListings(identity, result.listings);
  if (primary.prices.length > 0) return { ...primary, looseMatch: false };

  // Every tier above still requires the set name (or one of its split-name
  // candidates) to appear in the listing — dropping it entirely is the last
  // real lever before giving up to a sport/age/grade guess with zero market
  // input. This is deliberately NOT merged into the tiers above: it's a much
  // looser query (year + brand + card number + player only), and running it
  // unconditionally would risk exactly the kind of cross-product pollution
  // already fixed once for cardQueryBroadest (a shared card number across
  // unrelated inserts in the same release). Only worth that risk when
  // nothing else found anything at all — and it still goes through the same
  // print-run/parallel/grade corroboration checks as everything else, so a
  // wrong-parallel or wrong-grade match still gets filtered out here too.
  const looseQuery = [identity.year, identity.brand, identity.cardNumber && `#${identity.cardNumber}`, identity.player]
    .filter(Boolean)
    .join(" ");
  const looseResult = await searchEbayListings(looseQuery, 10);
  if (!looseResult.configured || looseResult.error || looseResult.listings.length === 0) {
    return { ...primary, looseMatch: false };
  }
  const looseTagged: TieredEbayListing[] = looseResult.listings.map((l) => ({ ...l, exactMatch: false }));
  const loose = extractPricesFromListings(identity, looseTagged);
  return { ...loose, looseMatch: loose.prices.length > 0 };
}

function modeledFallback(identity: CardIdentity): Valuation {
  const base = SPORT_BASELINE[identity.sport] ?? 25;
  const yearNum = parseInt(identity.year, 10);
  const age = Number.isFinite(yearNum) ? Math.max(0, 2026 - yearNum) : 10;
  const vintageMultiplier = age > 40 ? 12 : age > 20 ? 3 : age > 5 ? 1.4 : 1;
  const gradeMultiplier = identity.grade?.includes("10")
    ? 1.6
    : identity.grade?.includes("9")
    ? 1.2
    : identity.grade
    ? 1
    : 0.8;
  const estimate = Math.round(base * vintageMultiplier * gradeMultiplier);

  return {
    estimate,
    low: Math.round(estimate * 0.75),
    high: Math.round(estimate * 1.35),
    trend: "flat",
    trendPercent: 0,
    confidence: "low",
    matchedComp: null,
    note: "No comparable sales found in sample market data — this is a rough modeled estimate based on sport, card age, and grade only.",
  };
}

async function fallbackValuation(
  identity: CardIdentity
): Promise<{ valuation: Valuation; sales: Sale[]; population: Population | null; trending: TrendingSignal | null }> {
  const { prices, broadMatch, looseMatch } = await ebayPrices(identity);
  const modeled = modeledFallback(identity);
  const broadCaveat = broadMatch
    ? " Includes listings for other parallels/versions of this same base card (year/set/number/player), not just this exact one, which may differ in value."
    : "";
  // Only reached when every normal tier (including the split-name/broadest
  // ones) found nothing — the set name itself never appeared in a single
  // listing. Matched purely on year/brand/card number/player, so this is
  // real market data but for a much less certain "same card" claim than the
  // broadMatch case above (that still requires the set name to show up
  // somewhere). Confidence is capped at "low" regardless of listing count.
  const looseCaveat = looseMatch
    ? " This card's own set name didn't turn up in any listing at all, so this is matched only on year/brand/card number/player — it could be a different parallel or even a different product from the same release."
    : "";

  let valuation: Valuation;

  if (prices.length >= 3) {
    // Enough real listings to stand on their own as the estimate.
    const estimate = Math.round(median(prices));
    const { low, high } = interquartileRange(prices);
    valuation = {
      estimate,
      low: Math.round(low),
      high: Math.round(high),
      trend: "flat",
      trendPercent: 0,
      confidence: looseMatch ? "low" : "medium",
      matchedComp: null,
      note: `Based on ${prices.length} current eBay listings for this card (median asking price, range trimmed to the middle 50% to avoid mismatched search results skewing it) — these are active listings, not confirmed sold prices, so this isn't as reliable as a real sold-comp match.${broadCaveat}${looseCaveat}`,
    };
  } else if (prices.length > 0) {
    // Too few listings for a confident median, but any real evidence beats
    // a blind sport/age/grade guess — and beats it in *either* direction.
    // A one-way "floor" (only raise the modeled guess, never lower it) was
    // the previous approach here, but that meant a formula that overshot
    // reality (e.g. guessing $32 when the one real listing is $21) never
    // got corrected downward. Use the real price(s) directly instead.
    const observedAvg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const estimate = Math.round(observedAvg);
    valuation = {
      estimate,
      low: Math.round(estimate * 0.75),
      high: Math.round(estimate * 1.35),
      trend: "flat",
      trendPercent: 0,
      confidence: "low",
      matchedComp: null,
      note: `Only ${prices.length} real eBay listing${prices.length > 1 ? "s" : ""} found — not enough for a confident market estimate, but still more reliable than a formula guess with no real data, so used directly (see Current eBay Listings below).${broadCaveat}${looseCaveat}`,
    };
  } else {
    valuation = modeled;
  }

  const careerStats = await getCareerStats(identity.player, identity.sport);
  const trending = computeTrending("flat", 0, [], careerStats, null, prices.length, identity.sport);

  return { sales: [], population: null, trending, valuation };
}

export async function getValuation(
  identity: CardIdentity
): Promise<{ valuation: Valuation; sales: Sale[]; population: Population | null; trending: TrendingSignal | null }> {
  const match = findBestMatch(identity);

  // A raw copy and a graded copy of the same card are different products
  // that can differ 2-3x in price for vintage rookies — the sample sold-comp
  // database only has one grade tier per card (e.g. only SGC 9 sales for the
  // 1989 Griffey UD #1), so matching on identity fields alone let a raw
  // Griffey get priced off graded SGC 9 sold comps ($290-340) instead of the
  // $80-250 raw copies actually sell for. Same raw-vs-graded split the eBay
  // live-listing path already enforces; fall back to it here too so a
  // mismatched-grade sample match doesn't get used as-is.
  const identityIsGraded = Boolean(identity.gradingCompany && identity.grade);
  const matchIsGraded = Boolean(match?.gradingCompany && match?.grade);
  if (!match || match.sales.length === 0 || identityIsGraded !== matchIsGraded) {
    return fallbackValuation(identity);
  }

  const { estimate, low, high } = weightedEstimate(match.sales);
  const { trend, trendPercent } = computeTrend(match.sales);
  const exactGradeMatch = identity.grade === match.grade;

  const valuation: Valuation = {
    estimate,
    low,
    high,
    trend,
    trendPercent,
    confidence: exactGradeMatch ? "high" : "medium",
    matchedComp: `${match.year} ${match.brand} ${match.setName} #${match.cardNumber} ${match.player} (${match.grade === "" ? "raw" : `${match.gradingCompany} ${match.grade}`})`,
    note: exactGradeMatch
      ? "Estimate based on recent sold comps for this exact card and grade."
      : `Estimate based on recent sold comps for this card; grade may differ from your listed ${identity.grade || "ungraded"} copy.`,
  };

  const sortedSales = [...match.sales].sort((a, b) => (a.date < b.date ? 1 : -1));
  const careerStats = await getCareerStats(match.player, match.sport);

  // A population count is specific to one exact grade at one exact grading
  // company — it says nothing meaningful about a raw card, and it's wrong
  // (not just imprecise) for a card graded differently than the matched
  // comp. Only carry it through when the user's own card is graded at
  // exactly the same company+grade the population figure actually
  // describes; otherwise a raw Ken Griffey Jr. rookie was showing an "SGC 9"
  // population report that had nothing to do with the raw copy in hand.
  const populationMatchesIdentity =
    match.population &&
    identity.gradingCompany === match.population.gradingCompany &&
    identity.grade === match.population.grade;

  return {
    valuation,
    sales: sortedSales,
    population: populationMatchesIdentity ? match.population : null,
    trending: computeTrending(trend, trendPercent, sortedSales, careerStats, match.hallOfFameChance, 0, match.sport),
  };
}
