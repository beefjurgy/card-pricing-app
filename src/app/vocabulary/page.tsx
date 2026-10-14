import Link from "next/link";
import { SectionHeading } from "@/components/SectionHeading";

interface Term {
  term: string;
  definition: string;
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
      "A variant of a base (or insert) card that reuses the same photo and design but changes the color, finish, or border — e.g. a \"Blue\" or \"Gold\" version of the same card. Usually scarcer than base, and often serial-numbered. Different parallels of the identical card can vary wildly in value, so getting this field right matters a lot for an accurate estimate.",
  },
  {
    term: "Prizm",
    definition:
      "Panini's flagship chrome-style finish, used across many of their products (Prizm, Select, Mosaic, Donruss Optic, etc.) — a reflective surface that comes in many named color parallels (Silver, Blue, Red Wave, Hyper, and so on).",
  },
  {
    term: "Refractor",
    definition:
      "Topps' version of a chrome/prismatic finish, most associated with Topps Chrome and Bowman Chrome — a rainbow-tinted, light-refracting layer over the card's surface, also available in many named color parallels.",
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
    term: "Short Print (SP) / SSP",
    definition:
      "A Short Print (SP) is printed in a smaller quantity than the regular base set, without necessarily being numbered. A Super Short Print (SSP) is rarer still — smaller than even a standard SP. Both are prized for scarcity, often commanding a premium even unnumbered and unautographed.",
  },
  {
    term: "Slabs / Slabbed",
    definition:
      "Slabbing is a synonym for grading. A slabbed card is a graded card. Refers to the hard plastic case (the \"slab\") that companies like PSA, BGS, or SGC seal a card in once it's graded.",
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
            <SectionHeading className="mb-2">{t.term}</SectionHeading>
            <p className="text-sm text-muted leading-relaxed">{t.definition}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
