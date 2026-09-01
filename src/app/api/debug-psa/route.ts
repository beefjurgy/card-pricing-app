import { NextResponse } from "next/server";

// TEMPORARY diagnostic route — find out what PSA_API_TOKEN actually grants
// access to (cert-verification only, vs. price-guide/sold-comp data), since
// nothing in the app calls PSA's API yet and the token's scope was unknown.
// Delete once that's answered.
export async function GET() {
  const token = process.env.PSA_API_TOKEN;
  if (!token) return NextResponse.json({ error: "PSA_API_TOKEN not set" }, { status: 500 });

  const certNumber = "57545501";
  const res = await fetch(`https://api.psacard.com/publicapi/cert/GetByCertNumber/${certNumber}`, {
    headers: { Authorization: `bearer ${token}` },
  });
  const text = await res.text();
  return NextResponse.json({ status: res.status, body: text.slice(0, 3000) });
}
