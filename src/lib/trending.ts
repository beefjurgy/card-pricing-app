import { CareerStats, HallOfFameChance, Sale, Sport, TrendingSignal, Trend } from "./types";

const SPORT_EMOJI: Record<Sport, string> = {
  Baseball: "⚾",
  Basketball: "🏀",
  Football: "🏈",
  Hockey: "🏒",
  Soccer: "⚽",
  Other: "🎴",
};

function formatCareerStats(stats: CareerStats): string {
  const line = stats.lines.map((l) => `${l.value} ${l.label}`).join(", ");
  return `Career: ${line} (${stats.asOf})`;
}

// Combines signals that are actually computed from the app's own sales data
// (price trend, sale frequency) or, for cards with no matched comp, the count
// of current active eBay listings — with career batting totals and a Hall of
// Fame chance reading tied to the matched comp. Career stats and Hall of Fame
// chance are both purely informational — they reflect career legacy, not
// current market momentum. The Hot/Rising/Steady/Cooling label+score is only
// produced when there's real sale history to compute it from (the sample/mock
// comps) — real scanned cards have no sold-price history, so rather than show
// a score that can never move off its default (always landing on "Steady"),
// they get the factual bullet list with no label at all.
export function computeTrending(
  trend: Trend,
  trendPercent: number,
  sales: Sale[],
  careerStats: CareerStats | null,
  hallOfFameChance: HallOfFameChance | null,
  activeListingCount = 0,
  sport: Sport = "Other"
): TrendingSignal | null {
  if (sales.length === 0 && !careerStats && !hallOfFameChance && activeListingCount === 0) return null;

  const factors: string[] = [];
  let label: TrendingSignal["label"];
  let score: TrendingSignal["score"];

  if (sales.length > 0) {
    let scoreValue = 50;

    const priceDelta = Math.max(-25, Math.min(25, trendPercent * 1.2));
    scoreValue += priceDelta;
    if (trend !== "flat") {
      factors.push(`Recent sale prices trending ${trend === "up" ? "up" : "down"} ${Math.abs(trendPercent)}%`);
    }

    const now = new Date("2026-08-26").getTime();
    const recentCount = sales.filter((s) => now - new Date(s.date).getTime() < 30 * 24 * 60 * 60 * 1000).length;
    const velocityBonus = Math.min(recentCount * 3, 15);
    scoreValue += velocityBonus;
    if (recentCount > 0) {
      factors.push(`${recentCount} sale${recentCount === 1 ? "" : "s"} recorded in the last 30 days`);
    }

    score = Math.max(0, Math.min(100, Math.round(scoreValue)));
    label = score >= 75 ? "Hot" : score >= 58 ? "Rising" : score <= 35 ? "Cooling" : "Steady";
  }

  if (careerStats) {
    factors.push(`${SPORT_EMOJI[sport]} ${formatCareerStats(careerStats)}`);
  }

  if (hallOfFameChance) {
    factors.push(
      `🏆 Hall of Fame chance: ${hallOfFameChance.percent}% — ${hallOfFameChance.note} (based on sample internet chatter, illustrative)`
    );
  }

  if (sales.length === 0 && activeListingCount > 0) {
    factors.push(`${activeListingCount} active eBay listing${activeListingCount === 1 ? "" : "s"} found for this card right now`);
  }

  return { label, score, factors };
}
