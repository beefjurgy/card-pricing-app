import { CARD_SUPPLIES, getAmazonSearchUrl, hasAffiliateTag } from "@/lib/affiliateLinks";

// Deliberately styled apart from the real content sections above (no
// highlighter heading, muted background) so it reads as sponsored/ad
// content rather than data about the card itself.
export function ShopSupplies() {
  return (
    <div className="rounded-xl border border-border bg-surface-2/60 p-5">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="font-medium text-muted">Protect This Card</h2>
        <span className="text-[10px] uppercase tracking-wide text-muted/70 border border-border rounded-full px-2 py-0.5">
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
            className="px-3 py-2 rounded-md border border-border text-sm text-center text-muted hover:bg-surface-2 hover:text-foreground transition-colors"
          >
            {supply.label} ↗
          </a>
        ))}
      </div>
      {hasAffiliateTag() && (
        <p className="text-xs text-muted border-t border-border pt-3 mt-4">
          As an Amazon Associate we earn from qualifying purchases.
        </p>
      )}
    </div>
  );
}
