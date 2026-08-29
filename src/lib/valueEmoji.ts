// A fun value-tier indicator used in place of the old trend arrow — trend
// data is always flat/0% for real scanned cards (the eBay-listings fallback
// path has no price-history to compute an actual trend from), so a "0%"
// badge read as a measured result when it wasn't one.
export function valueEmoji(estimate: number): string {
  if (estimate < 10) return "💵";
  if (estimate < 50) return "💰";
  return "🤑";
}
