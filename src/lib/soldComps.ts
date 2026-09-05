import "server-only";
import { CardIdentity } from "./types";
import { cardQuery } from "./platformLinks";

interface SaleRecord {
  title: string;
  price: number | null;
}

export interface SoldCompsResult {
  prices: number[];
  count: number;
}

// Same grading-company list valuation.ts uses for the eBay Browse API path.
const KNOWN_GRADING_COMPANIES = ["PSA", "BGS", "SGC", "CGC", "CCG", "BGG", "PGS", "FCGS"];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function titleMentionsCompany(title: string, company: string): boolean {
  return new RegExp(`\\b${escapeRegExp(company.trim())}\\b`, "i").test(title);
}

function titleMentionsAnyOtherCompany(title: string, company: string): boolean {
  const upper = company.trim().toUpperCase();
  return KNOWN_GRADING_COMPANIES.some((candidate) => candidate !== upper && titleMentionsCompany(title, candidate));
}

// Same reasoning as valuation.ts's titleStatesDifferentGrade — a title
// naming the same grading company but a different explicit grade number is
// confirmed proof this sale isn't the card in hand, not weak evidence for
// it (the bug this whole feature grew out of: a PSA 8 sale badly skewing a
// PSA 6 estimate).
function titleStatesDifferentGrade(title: string, gradingCompany: string, grade: string): boolean {
  const company = escapeRegExp(gradingCompany.trim());
  const gradeNum = parseFloat(grade);
  if (!company || Number.isNaN(gradeNum)) return false;
  const match = title.match(new RegExp(`${company}\\D{0,10}(\\d{1,2}(?:\\.\\d)?)\\b`, "i"));
  return match !== null && parseFloat(match[1]) !== gradeNum;
}

function titleIndicatesAutograph(title: string): boolean {
  return /\bauto(?:s|graph(?:s|ed)?)?\b/i.test(title);
}

async function fetchSaleRecords(query: string): Promise<SaleRecord[]> {
  const apiKey = process.env.THE_CARD_API_KEY;
  if (!apiKey) return [];
  try {
    const url = `https://www.thecardapi.com/api/v1/market/sales?q=${encodeURIComponent(query)}&platform=ebay&category=sports&limit=50`;
    const res = await fetch(url, { headers: { "x-market-api-key": apiKey } });
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: SaleRecord[] };
    return data.data ?? [];
  } catch (err) {
    console.error("Sold comps fetch failed:", err);
    return [];
  }
}

// thecardapi.com's structured grader/grade filters come back empty for
// eBay-sourced records specifically — verified live: grade/grader are null
// even on a record whose title plainly states one (e.g. "BGS 9.5"). So
// matching happens the same way the eBay Browse API listings already get
// matched in valuation.ts: against each record's raw title. This is a
// smaller version of that logic — grade/company/autograph only, no
// parallel or print-run matching yet — since a short sold-data lookback
// window (3 days on the free tier) already means a small sample; the full
// listing-matcher's extra precision isn't worth the extra complexity here
// until real usage shows it's needed.
export async function getSoldComps(identity: CardIdentity): Promise<SoldCompsResult | null> {
  const records = await fetchSaleRecords(cardQuery(identity));
  if (records.length === 0) return null;

  const isGraded = Boolean(identity.gradingCompany && identity.grade);
  const matched = records.filter((r) => {
    if (titleIndicatesAutograph(r.title) !== identity.isAutograph) return false;
    const titleIsGraded = KNOWN_GRADING_COMPANIES.some((c) => titleMentionsCompany(r.title, c));
    if (titleIsGraded !== isGraded) return false;
    if (isGraded) {
      if (titleMentionsAnyOtherCompany(r.title, identity.gradingCompany)) return false;
      if (titleStatesDifferentGrade(r.title, identity.gradingCompany, identity.grade)) return false;
    }
    return true;
  });

  const prices = matched.map((r) => r.price).filter((p): p is number => typeof p === "number" && p > 0);
  if (prices.length === 0) return null;

  return { prices, count: prices.length };
}
