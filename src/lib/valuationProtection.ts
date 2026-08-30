// A note containing this exact phrase marks a valuation as manually
// corrected from a real sold comp the collector supplied directly — the
// algorithm has no way to independently confirm those numbers, so an
// automatic refresh must never silently overwrite them. No "server-only"
// import here (unlike valuation.ts) so both the API route and client
// components can share this same check.
const PROTECTED_NOTE_MARKER = "supplied directly by the collector";

export function isProtectedValuation(note: string): boolean {
  return note.includes(PROTECTED_NOTE_MARKER);
}
