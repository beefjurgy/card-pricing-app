import { LibraryCard } from "./types";

// A card with no owner (not yet backfilled, or added before auth existed)
// belongs to no one — never treat that as "this session owns it."
export function isCardOwner(userId: string | null | undefined, card: Pick<LibraryCard, "userId">): boolean {
  return Boolean(userId) && userId === card.userId;
}

// Purchase price/date/platform, and the sold price/date/platform once a
// card's marked sold, are the only fields hidden from a public, logged-out
// (or non-owner) viewer — everything else (identity, images, valuation,
// description, career stats, and the isSold flag itself) is what makes a
// showcase profile worth looking at in the first place. isSold stays
// visible deliberately — the point of the feature is a public "SOLD" badge
// — only the actual sale price is treated as private, same as purchase price.
export function redactForViewer(card: LibraryCard, viewerId: string | null | undefined): LibraryCard {
  if (isCardOwner(viewerId, card)) return card;
  return { ...card, purchasePrice: null, purchaseDate: null, purchasePlatform: null, soldPrice: null, soldDate: null, soldPlatform: null };
}
