import { LibraryCard } from "./types";

export type SortOption = "recent" | "oldest" | "value-high" | "value-low" | "brand" | "grade" | "sport";

export const SORT_LABELS: Record<SortOption, string> = {
  recent: "Recently Added",
  oldest: "Oldest First",
  "value-high": "Highest Value",
  "value-low": "Lowest Value",
  brand: "Brand (A–Z)",
  grade: "Grade (High to Low)",
  sport: "Sport (A–Z)",
};

function gradeValue(grade: string): number {
  const n = parseFloat(grade);
  return Number.isFinite(n) ? n : -1;
}

export function sortCards(cards: LibraryCard[], sortBy: SortOption): LibraryCard[] {
  const sorted = [...cards];
  switch (sortBy) {
    case "recent":
      return sorted.sort((a, b) => (a.dateAdded < b.dateAdded ? 1 : a.dateAdded > b.dateAdded ? -1 : 0));
    case "oldest":
      return sorted.sort((a, b) => (a.dateAdded < b.dateAdded ? -1 : a.dateAdded > b.dateAdded ? 1 : 0));
    case "value-high":
      return sorted.sort((a, b) => b.valuation.estimate - a.valuation.estimate);
    case "value-low":
      return sorted.sort((a, b) => a.valuation.estimate - b.valuation.estimate);
    case "brand":
      return sorted.sort((a, b) => a.brand.localeCompare(b.brand) || a.player.localeCompare(b.player));
    case "grade":
      return sorted.sort((a, b) => gradeValue(b.grade) - gradeValue(a.grade));
    case "sport":
      return sorted.sort((a, b) => a.sport.localeCompare(b.sport) || a.player.localeCompare(b.player));
  }
}

export function isSortOption(value: string | null): value is SortOption {
  return !!value && value in SORT_LABELS;
}
