import Link from "next/link";
import { SectionHeading } from "@/components/SectionHeading";

interface Term {
  term: string;
  definition: string;
  // Text descriptions of a specific finish/pattern are notoriously
  // unreliable — even dedicated hobby reference sites disagree with each
  // other on what some of these (Disco, Raywave, Pulsar) actually look
  // like. A live eBay search shows real current cards with that exact
  // finish instead of a static (and possibly wrong) photo we'd have to
  // keep hosting and maintaining ourselves.
  exampleSearch?: string;
}

function ebaySearchUrl(query: string): string {
  return `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`;
}

// Alphabetized by term.
const TERMS: Term[] = [
  {
    term: "Base",
    definition:
      "The standard, most common version of a card in a set — no special color, finish, or parallel treatment. Everything else (parallels, inserts, autos) is a variation on or addition to the base set.",
  },
  {
    term: "Breaks",
    definition:
      "Opening product, especially used for group breaks: a case is made up of several boxes, similar to buying a case of beer, and buyers split up teams/slots before the host opens everything live on stream.",
  },
  {
    term: "Case hit",
    definition:
      "A card expected to appear about once per sealed case (a case = several boxes, usually 8–18). A rarity tier above a \"box hit\" — the top-of-the-pyramid pull for a given product, often a named insert (Panini's \"Kaboom!\" or \"Downtown\" are classic examples). Not automatically the most valuable card, just the rarest by print odds.",
  },
  {
    term: "Graded",
    definition:
      "A card sent to a third-party company (PSA, BGS, SGC, CSG) that authenticates it and assigns a numeric condition score, typically 1–10. Once graded, it's usually sealed in a slab. A \"Gem Mint 10\" (or 9.5+ for BGS) is the top grade — sharp corners, crisp edges, clean surface, good centering.",
  },
  {
    term: "Grails",
    definition:
      "A card a collector has been chasing for years — the \"holy grail\" of your want list. Often high-end or personally meaningful, not necessarily the most expensive card that exists.",
  },
  {
    term: "Holo / Holographic",
    definition:
      "A much older and more general finish than the newer named ones below — a foil layer that diffracts light into a shifting rainbow as the card tilts. Predates Prizm/Chrome-era naming, going back to early-90s sports cards and the original 1999 Pokémon base set. \"Spot holo\" limits the effect to part of the card (a border or logo); \"reverse holo\" flips it, leaving the art solid and making the background shine instead.",
    exampleSearch: "holographic parallel trading card",
  },
  {
    term: "Insert",
    definition:
      "A card from a separate, often thematic subset within a product — a different design from the base set entirely, not just a recolor of it (unlike a parallel). Panini's \"Kaboom!\" or Topps' \"Diamond Anniversary\" are examples. An insert can itself have its own parallels.",
  },
  {
    term: "Mags",
    definition:
      "Short for mag holders (magnetic case), also called \"One-Touch\" holders — a magnetic case typically used for mid- to high-end cards that aren't graded but need protection similar to a top loader, preferred for how they display the card.",
  },
  {
    term: "1-of-1 (1/1)",
    definition:
      "The rarest possible print run — exactly one copy of that specific parallel exists. Printed on the card as \"1/1.\" Not every set has one; when it does, it's usually the single chase card of the whole release.",
  },
  {
    term: "Checker / Checkerboard",
    definition:
      "A Prizm-family parallel with a black-and-white (or colored) checkerboard pattern across the card face, usually a short print. Also sold under \"Checker Board\" — sellers use the names interchangeably.",
    exampleSearch: "panini prizm checkerboard parallel",
  },
  {
    term: "Disco",
    definition:
      "A Prizm-family finish with a distinctive dotted, refractive texture — sellers sometimes describe it as resembling a disco ball's reflection. Appears in multiple colorways across several Prizm products and years.",
    exampleSearch: "panini prizm disco parallel",
  },
  {
    term: "Leather",
    definition:
      "A textured parallel finish used in a few Panini premium products — appearance varies by set and year, with no single consistent look across products, so it's worth checking a seller's actual photos for the specific set you're after.",
    exampleSearch: "panini leather parallel card",
  },
  {
    term: "Mags",
    definition:
      "Short for mag holders (magnetic case), also called \"One-Touch\" holders — a magnetic case typically used for mid- to high-end cards that aren't graded but need protection similar to a top loader, preferred for how they display the card.",
  },
  {
    term: "Mojo",
    definition:
      "A patterned Prizm-family finish — a diagonal, wave-like texture across the whole card face, distinct from a plain colored Prizm's flat shine. Often a limited print run (e.g. /25) from hobby boxes specifically.",
    exampleSearch: "panini prizm mojo parallel",
  },
  {
    term: "Mosaic",
    definition:
      "A Panini product line (like Prizm or Select) built around a chrome finish with a tiled, stained-glass-like background pattern, most visible on its colored parallels — base cards in some years lean closer to a plain chrome look, with the mosaic pattern showing up more on the parallel tiers.",
    exampleSearch: "panini mosaic parallel",
  },
  {
    term: "Numbered",
    definition:
      "A parallel with a limited, fixed print run, printed directly on the card as \"x/y\" (e.g. \"23/99\" means this is copy 23 of 99 ever made). Lower print runs are scarcer and typically worth more — the rarest is a 1-of-1 (above).",
  },
  {
    term: "Nukes",
    definition: "A term for the standout, high-value pulls.",
  },
  {
    term: "Parallel",
    definition:
      "A variant of a base (or insert) card that reuses the same photo and design but changes the color, finish, or border — e.g. a \"Blue\" or \"Gold\" version of the same card. Usually scarcer than base, and often serial-numbered. Different parallels of the identical card can vary wildly in value, so getting this field right matters a lot for an accurate estimate. New named finishes get invented every year (see Mojo, Disco, Raywave, Pulsar, Shimmer, Checker, Stained Glass, and Leather below for a sample) — this list can never be fully complete, so when in doubt, match what's actually printed on the card itself.",
  },
  {
    term: "Prizm",
    definition:
      "Panini's flagship chrome-style finish, used across many of their products (Prizm, Select, Mosaic, Donruss Optic, etc.) — a reflective surface that comes as a whole family of named finish patterns (Silver, Hyper, Wave, Mojo, Disco, Shimmer, Pulsar, Checker, and dozens more), not just plain colors.",
    exampleSearch: "panini prizm parallel",
  },
  {
    term: "Pulsar",
    definition:
      "A patterned Prizm-family finish, typically a solid-colored background with a distinct pulsing overlay pattern. Comes in many colorways and print runs across different Prizm products.",
    exampleSearch: "panini prizm pulsar parallel",
  },
  {
    term: "Raywave",
    definition:
      "A refractor-style \"ray wave\" finish used by both Panini (as a Prizm parallel) and Topps (as \"RayWave Refractor,\" mainly in Chrome products) — same name, different companies and products, so check which brand a specific card is from.",
    exampleSearch: "raywave refractor parallel",
  },
  {
    term: "Refractor",
    definition:
      "Topps' version of a chrome/prismatic finish, most associated with Topps Chrome and Bowman Chrome — a rainbow-tinted, light-refracting layer over the card's surface, also available in many named color parallels.",
    exampleSearch: "topps chrome refractor parallel",
  },
  {
    term: "Rips / Ripping",
    definition:
      "Opening a pack, box, or case of cards — \"Box Break / Rip / Ripped / Ripping: to open a pack, box or case of trading cards.\" Comes from the old wax-paper wrappers.",
  },
  {
    term: "RPA",
    definition:
      "Short for Rookie Patch Autograph — a rookie card that combines a jersey/patch swatch with the player's autograph. Widely considered one of the most desirable rookie card formats in the hobby.",
  },
  {
    term: "Shimmer",
    definition:
      "A named Prizm-family parallel tier (not just a generic shiny look) — appears in colors like Red, Blue, Green, and Black Shimmer across Prizm and Donruss Optic, usually among the rarer, higher-end parallels in a product's lineup.",
    exampleSearch: "panini prizm shimmer parallel",
  },
  {
    term: "Short Print (SP) / SSP",
    definition:
      "A Short Print (SP) is printed in a smaller quantity than the regular base set, without necessarily being numbered. A Super Short Print (SSP) is rarer still — smaller than even a standard SP. Both are prized for scarcity, often commanding a premium even unnumbered and unautographed.",
  },
  {
    term: "Slabs / Slabbed",
    definition:
      "Slabbing is a synonym for grading. A slabbed card is a graded card. Refers to the hard plastic case (the \"slab\") that companies like PSA, BGS, or SGC seal a card in once it's graded.",
  },
  {
    term: "Stained Glass",
    definition:
      "A bold, mosaic-styled insert/parallel from Panini Mosaic products, sometimes printed as an oversized card. Sources disagree on whether it counts as an insert or a parallel in a given year — check the specific set's checklist.",
    exampleSearch: "panini mosaic stained glass",
  },
  {
    term: "Velocity",
    definition:
      "A holographic-looking Prizm-family parallel, mainly seen in Panini Donruss Optic — comes in many colors (Pink, Blue, Green, Black, Red, Bronze, White, Gold) each with its own print run.",
    exampleSearch: "donruss optic velocity parallel",
  },
  {
    term: "Wave",
    definition:
      "A wave-grain textured finish, usually seen as a suffix on a color name (\"Red Wave,\" \"Ruby Wave\") within the Prizm family — distinct from the similarly-named Raywave, which is its own separate named finish.",
    exampleSearch: "panini prizm wave parallel",
  },
];

export default function VocabularyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <Link href="/" className="text-muted hover:text-foreground text-sm">
        ← Nukes
      </Link>

      <h1 className="text-3xl font-bold tracking-tight mt-4">Lingo</h1>
      <p className="text-muted text-sm mt-1">Collector slang you'll run into while ripping, breaking, and grail-hunting.</p>

      <div className="mt-8 space-y-6">
        {TERMS.map((t) => (
          <div key={t.term} className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <SectionHeading>{t.term}</SectionHeading>
              {t.exampleSearch && (
                <a
                  href={ebaySearchUrl(t.exampleSearch)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent-2 hover:underline whitespace-nowrap shrink-0"
                >
                  See examples ↗
                </a>
              )}
            </div>
            <p className="text-sm text-muted leading-relaxed">{t.definition}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
