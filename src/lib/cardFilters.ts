import { LibraryCard } from "./types";

// There's no dedicated structured field for "this is a memorabilia/relic
// card" (unlike isAutograph), so this checks the same free-text fields the
// identify step already fills in — parallel, set name, and the AI's own
// identification notes reliably mention "Relic"/"Patch"/"Jersey"/
// "Memorabilia"/"Swatch"/"(MEM)" for these cards, the same way a title
// reliably mentions "auto" elsewhere in this app. identifyNotes matters on
// its own: a real swatch can be confirmed there ("Card features a
// memorabilia swatch (jersey patch)") even when the parallel/set name
// alone don't name it (e.g. "Blue Hyper Prizm" / "Donruss Threads" names
// neither the parallel color nor the insert line as memorabilia-specific
// text). Word-boundary matching (not a plain substring) so "mem" doesn't
// also catch an unrelated word like a "Memphis" team reference.
// "threads" deliberately excluded from matching the set name — it's the
// literal product-line name of Topps Triple Threads, which has plenty of
// non-relic base/parallel cards (e.g. a plain "Base /1449" or "Sepia /639"
// photo variation with no memorabilia window at all). Matching the set
// name on that word false-positived every card in that entire line, not
// just its actual relic parallels — identifyNotes is what correctly tells
// a real swatch apart from a plain one in a "Threads"-named set instead.
const PATCH_KEYWORDS = ["relic", "patch", "jersey", "memorabilia", "swatch", "mem", "duals", "materials"];

// "jersey" is reliable in parallel/setName (a parallel literally named
// "Jersey Patch Auto" always means a physical swatch), but identifyNotes is
// natural-language prose that constantly uses "jersey" just to describe
// what the player is WEARING in the photo ("shown in his black home
// jersey") — nothing to do with a swatch embedded in the card. Confirmed
// live: two plain photo cards (no memorabilia window at all) both got
// miscategorized as Patch purely because their identifyNotes happened to
// mention a jersey color/team, with no other keyword present. Dropped from
// the notes-specific list; the others are far less likely to show up in a
// purely descriptive, non-memorabilia sentence.
const NOTES_PATCH_KEYWORDS = PATCH_KEYWORDS.filter((kw) => kw !== "jersey");

export function isPatchCard(card: LibraryCard): boolean {
  const parallelSetText = `${card.parallel} ${card.setName}`.toLowerCase();
  if (PATCH_KEYWORDS.some((kw) => new RegExp(`\\b${kw}\\b`).test(parallelSetText))) return true;
  const notesText = card.identifyNotes.toLowerCase();
  return NOTES_PATCH_KEYWORDS.some((kw) => new RegExp(`\\b${kw}\\b`).test(notesText));
}

// A serial-numbered parallel prints its own run directly on the card
// ("086/150"), and that run reliably ends up in the stored parallel field
// (e.g. "Purple /150") — same signal valuation.ts's extractPrintRun reads.
export function isNumberedCard(card: LibraryCard): boolean {
  return /\/\d{1,4}\b/.test(card.parallel);
}
