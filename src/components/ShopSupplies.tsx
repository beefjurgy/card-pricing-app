import { CARD_SUPPLIES, getAmazonSearchUrl, hasAffiliateTag } from "@/lib/affiliateLinks";
import { SectionHeading } from "./SectionHeading";

export function ShopSupplies() {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <SectionHeading className="mb-4">Protect This Card</SectionHeading>
      <div className="grid grid-cols-2 gap-2">
        {CARD_SUPPLIES.map((supply) => (
          <a
            key={supply.label}
            href={getAmazonSearchUrl(supply.query)}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="px-3 py-2 rounded-md border border-border text-sm text-center hover:bg-surface-2 transition-colors"
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
