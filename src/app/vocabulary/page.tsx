import Link from "next/link";
import { SectionHeading } from "@/components/SectionHeading";

interface Term {
  term: string;
  definition: string;
}

// Alphabetized by term.
const TERMS: Term[] = [
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
    term: "Mags",
    definition:
      "Short for mag holders (magnetic case), also called \"One-Touch\" holders — a magnetic case typically used for mid- to high-end cards that aren't graded but need protection similar to a top loader, preferred for how they display the card.",
  },
  {
    term: "Nukes",
    definition: "A term for the standout, high-value pulls.",
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
