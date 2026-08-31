import "server-only";

const EBAY_ENV = process.env.EBAY_ENV === "production" ? "production" : "sandbox";
const TOKEN_URL =
  EBAY_ENV === "production"
    ? "https://api.ebay.com/identity/v1/oauth2/token"
    : "https://api.sandbox.ebay.com/identity/v1/oauth2/token";
const API_BASE = EBAY_ENV === "production" ? "https://api.ebay.com" : "https://api.sandbox.ebay.com";

export interface EbayListing {
  itemId: string;
  title: string;
  price: number | null;
  condition: string;
  imageUrl: string | null;
  itemWebUrl: string;
}

export interface EbaySearchResult {
  configured: boolean;
  error: string | null;
  environment: "sandbox" | "production";
  listings: EbayListing[];
}

// In-memory cache for the application access token (client-credentials grant).
// This is a single Next.js dev/server process, so a module-level cache is
// fine — no shared store needed for a token that's the same for every user.
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope",
    }),
  });

  if (!res.ok) {
    console.error("eBay OAuth token request failed:", res.status, await res.text());
    return null;
  }

  const data = await res.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.token;
}

interface EbayItemSummary {
  itemId: string;
  title: string;
  price?: { value: string; currency: string };
  condition?: string;
  image?: { imageUrl: string };
  itemWebUrl: string;
}

/**
 * Searches eBay's Browse API for current active listings matching a query.
 * This returns real, live asking prices — NOT confirmed sold prices. eBay's
 * sold-comps data (Marketplace Insights API) requires a separate approval
 * we don't have yet, so this is deliberately labeled "current listings"
 * wherever it's shown, not "recent sales".
 */
export async function searchEbayListings(query: string, limit = 8): Promise<EbaySearchResult> {
  const environment = EBAY_ENV;
  const token = await getAccessToken();
  if (!token) {
    return { configured: false, error: null, environment, listings: [] };
  }

  const params = new URLSearchParams({ q: query, limit: String(limit) });
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/buy/browse/v1/item_summary/search?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
      },
    });
  } catch (err) {
    console.error("eBay search request failed:", err);
    return { configured: true, error: "Could not reach eBay.", environment, listings: [] };
  }

  if (!res.ok) {
    const text = await res.text();
    console.error("eBay search failed:", res.status, text);
    return { configured: true, error: `eBay search failed (${res.status}).`, environment, listings: [] };
  }

  const data = await res.json();
  const items = (data.itemSummaries || []) as EbayItemSummary[];
  const listings: EbayListing[] = items.map((item) => ({
    itemId: item.itemId,
    title: item.title,
    price: item.price?.value ? Number(item.price.value) : null,
    condition: item.condition || "",
    imageUrl: item.image?.imageUrl || null,
    itemWebUrl: item.itemWebUrl,
  }));

  return { configured: true, error: null, environment, listings };
}

export interface TieredEbayListing extends EbayListing {
  exactMatch: boolean;
}

export interface TieredEbaySearchResult {
  configured: boolean;
  error: string | null;
  environment: "sandbox" | "production";
  listings: TieredEbayListing[];
}

/**
 * Runs the exact-parallel query, a broader same-base-card query, and
 * (optionally) an even-broader query together and merges them, rather than
 * only falling back to a wider query when a narrower one comes back
 * completely empty. Parallel/variant names — and sometimes multi-word set
 * names — get described inconsistently across sellers (e.g. "Wave Refractor"
 * vs "Raywave" for the same print, or "Gilded Collection Chrome" vs just
 * "Gilded"), so even when a narrower query finds *something*, there are often
 * real listings of the same card that a one-or-the-other approach would hide.
 * Exact matches are listed first; broad/broadest matches are merged together
 * behind them (deduped) since both represent "same base card, different
 * wording" from the caller's perspective.
 */
export async function searchEbayListingsTiered(
  exactQuery: string,
  broadQuery: string,
  broadestQuery: string | null = null,
  limit = 10,
  extraQueries: string[] = []
): Promise<TieredEbaySearchResult> {
  const [exact, broad, broadest, ...extras] = await Promise.all([
    searchEbayListings(exactQuery, limit),
    searchEbayListings(broadQuery, limit),
    broadestQuery ? searchEbayListings(broadestQuery, limit) : Promise.resolve(null),
    ...extraQueries.map((q) => searchEbayListings(q, limit)),
  ]);

  if (!exact.configured) {
    return { configured: false, error: null, environment: exact.environment, listings: [] };
  }

  const seen = new Set(exact.listings.map((l) => l.itemId));
  const exactTagged: TieredEbayListing[] = exact.listings.map((l) => ({ ...l, exactMatch: true }));

  const wider: TieredEbayListing[] = [];
  for (const result of [broad, broadest, ...extras]) {
    if (!result || result.error) continue;
    for (const l of result.listings) {
      if (seen.has(l.itemId)) continue;
      seen.add(l.itemId);
      wider.push({ ...l, exactMatch: false });
    }
  }

  return {
    configured: true,
    error: exact.error,
    environment: exact.environment,
    listings: [...exactTagged, ...wider],
  };
}
