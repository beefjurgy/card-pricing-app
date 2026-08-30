// A manually-curated set of "featured" card ids, kept in the browser's own
// localStorage rather than the database — this is a personal viewing
// preference for a single-user app, not shared collection data, same
// reasoning as the featured-sport default this replaced.
const KEY = "beefynukes:featuredCardIds";

function readIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getFeaturedIds(): string[] {
  return readIds();
}

export function isFeatured(id: string): boolean {
  return readIds().includes(id);
}

const CHANGE_EVENT = "beefynukes:featured-changed";

// Lets any other mounted component (e.g. the library page's "Featured"
// pill/count) react immediately to a toggle made elsewhere (a card tile),
// without which a plain localStorage write is invisible to already-rendered
// components until they happen to re-fetch or remount.
export function onFeaturedChange(handler: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}

// Returns the new featured state (true if it just got added).
export function toggleFeatured(id: string): boolean {
  const ids = readIds();
  const idx = ids.indexOf(id);
  const next = idx === -1 ? [...ids, id] : ids.filter((x) => x !== id);
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return idx === -1;
}
