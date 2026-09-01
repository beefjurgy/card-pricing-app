import { CARD_SUPPLIES, getAmazonSearchUrl, hasAffiliateTag } from "@/lib/affiliateLinks";

// Deliberately styled apart from the real content sections above (a solid
// brand-green background, matching the footer) so it reads as sponsored/ad
// content rather than data about the card itself.
export function ShopSupplies() {
  return (
    <div className="rounded-xl bg-accent-2 text-background p-5">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="font-medium">Protect This Card</h2>
        <span className="text-[10px] uppercase tracking-wide text-background/70 border border-background/30 rounded-full px-2 py-0.5">
          Sponsored
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {CARD_SUPPLIES.map((supply) => (
          <a
            key={supply.label}
            href={getAmazonSearchUrl(supply.query)}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="px-3 py-2 rounded-md border border-background/30 text-sm text-center text-background/90 hover:bg-background/10 hover:text-background transition-colors"
          >
            {supply.label} ↗
          </a>
        ))}
      </div>
      {hasAffiliateTag() && (
        <p className="text-xs text-background/70 border-t border-background/20 pt-3 mt-4">
          As an Amazon Associate we earn from qualifying purchases.
        </p>
      )}
    </div>
  );
}
