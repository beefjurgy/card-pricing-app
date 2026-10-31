import { LibraryCard } from "./types";

const HEADERS = [
  "Player",
  "Sport",
  "Year",
  "Brand",
  "Set",
  "Card #",
  "Parallel / Variation",
  "Autograph",
  "Grading Company",
  "Grade",
  "Cert #",
  "Price Paid",
  "Current Value",
  "Sold",
  "Sold Price",
  "Link",
];

// Quote any field containing a comma, quote, or newline, doubling internal
// quotes — the one escaping rule CSV actually needs.
function csvField(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// Built as a source of truth for listing cards elsewhere (eBay, etc.) — the
// Link column points back to the card's own page, which has the full
// "Prepare Listing" helper (title/description builder, photos).
export function buildCardsCsv(cards: LibraryCard[], baseUrl: string): string {
  const rows = cards.map((card) =>
    [
      card.player,
      card.sport,
      card.year,
      card.brand,
      card.setName,
      card.cardNumber,
      card.parallel,
      card.isAutograph ? [card.autographCompany, card.autographGrade].filter(Boolean).join(" ") || "Yes" : "",
      card.gradingCompany,
      card.grade,
      card.certNumber,
      card.purchasePrice ?? "",
      card.valuation.estimate,
      card.isSold ? "Yes" : "",
      card.soldPrice ?? "",
      `${baseUrl}/card/${card.id}`,
    ]
      .map(csvField)
      .join(",")
  );

  return [HEADERS.join(","), ...rows].join("\n");
}
