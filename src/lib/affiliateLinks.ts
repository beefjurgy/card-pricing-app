export interface SupplyLink {
  label: string;
  query: string;
}

// Generic, always-relevant supply categories — not tailored per-card, since
// guessing specific ASINs risks linking to a discontinued/wrong product.
// Search-result links stay valid regardless of catalog changes.
export const CARD_SUPPLIES: SupplyLink[] = [
  { label: "Top Loaders", query: "trading card top loaders" },
  { label: "Penny Sleeves", query: "trading card penny sleeves" },
  { label: "Graded Card Display Stands", query: "graded card slab display stand" },
  { label: "Card Storage Box", query: "trading card storage box" },
];

// An affiliate tag isn't a secret — it's designed to appear in outbound
// links — so this reads a NEXT_PUBLIC_ var and can run in the client.
export function getAmazonSearchUrl(query: string): string {
  const tag = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG;
  const params = new URLSearchParams({ k: query });
  if (tag) params.set("tag", tag);
  return `https://www.amazon.com/s?${params.toString()}`;
}

export function hasAffiliateTag(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG);
}
