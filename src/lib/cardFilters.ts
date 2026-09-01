import { LibraryCard } from "./types";

// There's no dedicated structured field for "this is a memorabilia/relic
// card" (unlike isAutograph), so this checks the same free-text fields the
// identify step already fills in — parallel and set name reliably mention
// "Relic"/"Patch"/"Jersey"/"Memorabilia"/"Swatch"/"(MEM)" for these cards,
// the same way a title reliably mentions "auto" elsewhere in this app.
// Word-boundary matching (not a plain substring) so "mem" doesn't also
// catch an unrelated word like a "Memphis" team reference.
const PATCH_KEYWORDS = ["relic", "patch", "jersey", "memorabilia", "swatch", "mem", "threads", "duals", "materials"];
export function isPatchCard(card: LibraryCard): boolean {
  const text = `${card.parallel} ${card.setName}`.toLowerCase();
  return PATCH_KEYWORDS.some((kw) => new RegExp(`\\b${kw}\\b`).test(text));
}

// A serial-numbered parallel prints its own run directly on the card
// ("086/150"), and that run reliably ends up in the stored parallel field
// (e.g. "Purple /150") — same signal valuation.ts's extractPrintRun reads.
export function isNumberedCard(card: LibraryCard): boolean {
  return /\/\d{1,4}\b/.test(card.parallel);
}
