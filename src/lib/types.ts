export type Sport = "Baseball" | "Basketball" | "Football" | "Hockey" | "Soccer" | "Other";

export type Trend = "up" | "down" | "flat";

export interface CardIdentity {
  player: string;
  sport: Sport;
  year: string;
  brand: string;
  setName: string;
  cardNumber: string;
  parallel: string;
  gradingCompany: string;
  grade: string;
  certNumber: string; // grading company's cert/serial number printed on the slab label (often paired with a QR code). Empty if ungraded or not legible.
  isAutograph: boolean;
  autographCompany: string; // authentication company, e.g. PSA/DNA, JSA, Beckett Authentication. Empty if not autographed/unauthenticated.
  autographGrade: string; // separate auto grade if the authenticator assigns one distinct from the card grade. Empty if not applicable.
}

export interface Sale {
  date: string; // ISO date
  price: number;
  platform: string;
  grade: string;
}

export interface Valuation {
  estimate: number;
  low: number;
  high: number;
  trend: Trend;
  trendPercent: number;
  confidence: "high" | "medium" | "low";
  matchedComp: string | null;
  note: string;
}

export interface Population {
  gradingCompany: string;
  grade: string;
  popAtGrade: number;
  popHigher: number;
  asOf: string; // ISO date the population snapshot is from
}

// Career stat totals for a player, shown as a fun/informational factor in
// Trending. Categories differ by sport (baseball: AVG/H/HR/RBI, basketball:
// PPG/RPG/APG, etc.), so this is a flexible label/value line list rather than
// one fixed shape.
export interface CareerStatLine {
  label: string; // e.g. "AVG", "HR", "PPG"
  value: string;
}

export interface CareerStats {
  lines: CareerStatLine[];
  asOf: string; // season or date these totals are current through
}

// A sample "internet chatter" reading of Hall of Fame odds — illustrative
// only, not a real statistical projection or any live sentiment analysis.
export interface HallOfFameChance {
  percent: number; // 0-100, illustrative
  note: string;
}

export type TrendingLabel = "Hot" | "Rising" | "Steady" | "Cooling";

export interface TrendingSignal {
  // Only present when backed by real sale-history data to compute an actual
  // trend from (the sample/mock comps) — omitted for real scanned cards,
  // which have no sold-price history, rather than show a score that never
  // moves off its default and a label that's always "Steady".
  label?: TrendingLabel;
  score?: number; // 0-100 composite
  factors: string[];
}

export interface MarketEntry extends CardIdentity {
  compKey: string;
  imageEmoji: string;
  sales: Sale[];
  population: Population;
  // null for cards where a "Hall of Fame" concept doesn't apply, e.g.
  // non-sport novelty cards like Garbage Pail Kids.
  hallOfFameChance: HallOfFameChance | null;
}

export interface LibraryCard extends CardIdentity {
  id: string;
  imageUrl: string;
  backImageUrl: string | null;
  dateAdded: string;
  identifyConfidence: "high" | "medium" | "low";
  identifyNotes: string;
  valuation: Valuation;
  sales: Sale[];
  population: Population | null;
  trending: TrendingSignal | null;
  purchasePrice: number | null;
  purchaseDate: string | null;
  purchasePlatform: string | null;
}
