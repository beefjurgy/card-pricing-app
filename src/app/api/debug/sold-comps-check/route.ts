import { NextResponse } from "next/server";

// Temporary diagnostic route — no auth, but leaks nothing sensitive (key
// length only, never the value itself). Exists purely to debug why the
// sold-comps feature never fires in production without going through
// Vercel's log UI each time. Delete once the real cause is found.
export async function GET() {
  const apiKey = process.env.THE_CARD_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, reason: "THE_CARD_API_KEY is not set." });
  }

  const url = "https://www.thecardapi.com/api/v1/market/sales?q=Michael+Jordan&platform=ebay&limit=3";
  try {
    const res = await fetch(url, { headers: { "x-market-api-key": apiKey } });
    const body = await res.text();
    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      keyLength: apiKey.length,
      keyPrefix: apiKey.slice(0, 4),
      keySuffix: apiKey.slice(-4),
      bodyPreview: body.slice(0, 500),
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      reason: "fetch threw",
      error: err instanceof Error ? err.message : String(err),
      keyLength: apiKey.length,
    });
  }
}
