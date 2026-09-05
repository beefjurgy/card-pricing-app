// Best-effort link to a grading company's own population report tool.
// Only link directly to URLs we've actually verified; unknown companies
// fall back to a search rather than guessing at a page that may not exist.
const POP_REPORT_URLS: Record<string, string> = {
  PSA: "https://www.psacard.com/pop",
  BGS: "https://www.beckett.com/grading/pop-report",
  SGC: "https://gosgc.com/pop-report",
  // WCG (World Class Grading) has no population report or online cert
  // database at all — its own FAQ says so outright ("we don't currently
  // offer an online verification database"; cert checks are done by
  // emailing them the serial number). The main site is the most honest
  // destination available, same treatment as the lookup-page-only
  // companies below.
  WCG: "https://worldclassgrading.com/",
};

export function getPopReportUrl(gradingCompany: string): string {
  const url = POP_REPORT_URLS[gradingCompany.trim().toUpperCase()];
  if (url) return url;
  return `https://www.google.com/search?q=${encodeURIComponent(`${gradingCompany} population report`)}`;
}

// Direct per-cert lookup pages, verified against live responses. Unlike
// getPopReportUrl, there's no reasonable search fallback for an unsupported
// company — a cert number only means something on that company's own site —
// so this returns null rather than guessing at a URL that may not exist.
//
// SGC has no URL-based deep link at all — its cert-code-lookup page (verified
// live) takes the cert code only via a form field, gated behind a reCAPTCHA,
// and a `?cert=` query param does nothing (tested). The best honest link is
// the lookup page itself; the cert number can't be pre-filled.
//
// CCG (Collectible Card Grading, ccgrading.com) is the same shape as SGC —
// its /card-lookup/ page submits the serial number via a client-side JS
// fetch() POST to /search.php, no query-param support, no page to deep-link
// to (verified against the live page source). No CAPTCHA at least, but still
// just the lookup page with manual entry.
//
// BGG (Black Gold Grading) links out to a separate hosted tool at
// gold-grade-hub.lovable.app/lookup — a plain client-rendered React input
// with no name/id exposed and no query-param binding (`?cert=` tested live,
// did nothing). Same lookup-page-only treatment as SGC/CCG.
//
// PGS (Patriot Grading Service, sold under the patriotcardgrading.com domain
// but "PGS"/"PG<number>" is the company's own cert-number format) uses the
// exact same shared gold-grade-hub.lovable.app tool as BGG, just under the
// /pgs/lookup path — also verified no query-param pre-fill.
const CERT_LOOKUP_URLS: Record<string, (cert: string) => string> = {
  PSA: (cert) => `https://www.psacard.com/cert/${encodeURIComponent(cert)}`,
  // The old ?cert= param is dead — confirmed live (2026-09-04) that
  // navigating to it fires no lookup API call at all. Beckett's actual
  // card-lookup page reads item_id (the serial number, as printed on the
  // slab) + item_type (BGS/BVG/BCCG) and calls its own
  // /api/grading/lookup?category=...&serialNumber=... internally — verified
  // from a real card's URL the user copied directly out of their own
  // browser. That underlying API 403s from an automated browser (likely
  // reCAPTCHA/bot-detection gating, same class of wall as PSA's cert pages),
  // so this couldn't be fully end-to-end verified here, but the URL itself
  // is the real one the site's own UI produces.
  BGS: (cert) => `https://www.beckett.com/grading/card-lookup?item_id=${encodeURIComponent(cert)}&item_type=BGS`,
  SGC: () => `https://gosgc.com/cert-code-lookup`,
  CCG: () => `https://ccgrading.com/card-lookup/`,
  BGG: () => `https://gold-grade-hub.lovable.app/lookup`,
  PGS: () => `https://gold-grade-hub.lovable.app/pgs/lookup`,
};

export function getCertLookupUrl(gradingCompany: string, certNumber: string | undefined): string | null {
  // certNumber predates cards saved before this field existed, so library.json
  // records from before this feature won't have it — guard against that
  // rather than assuming every LibraryCard on disk matches the current type.
  if (!certNumber?.trim()) return null;
  const build = CERT_LOOKUP_URLS[gradingCompany.trim().toUpperCase()];
  return build ? build(certNumber.trim()) : null;
}
