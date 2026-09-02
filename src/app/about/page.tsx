import Link from "next/link";
import { SectionHeading } from "@/components/SectionHeading";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <Link href="/" className="text-muted hover:text-foreground text-sm">
        ← Nukes
      </Link>

      <h1 className="text-3xl font-bold tracking-tight mt-4">About CardNukes</h1>
      <p className="text-muted text-sm mt-1">Everything about your collection in one place.</p>

      <div className="mt-8 space-y-6">
        <div className="rounded-xl border border-border bg-surface p-5">
          <SectionHeading className="mb-3">About</SectionHeading>
          <div className="text-sm text-muted leading-relaxed space-y-4">
            <p>
              CardNukes is a card valuation app built for collectors who want to know what their cards are actually
              worth, right now. You scan or add a card, and it pulls real market data from recent sales to give you
              an up-to-date price instead of a guess.
            </p>
            <p>
              Every card you own lives in one place — your personal collection, tracked and organized so you always
              know what you&apos;re holding.
            </p>
            <p>
              The name comes from hobby slang: a &quot;nuke&quot; is a standout pull, a card so good it stops the
              room — and this is where you keep track of yours.
            </p>
            <p>
              Whether you&apos;re chasing grails, cracking a case hit, or just seeing what an old rookie card is
              worth today, CardNukes turns your stack of cards into a clear, current picture of your collection&apos;s
              value.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <SectionHeading className="mb-3">Why I built this</SectionHeading>
          <div className="text-sm text-muted leading-relaxed space-y-4">
            <p>
              I&apos;ve got the soul of a kid with adult money. Building this collection is about having fun chasing
              down the cards I dreamed of owning growing up — but the deeper I got into it, the more I noticed there
              wasn&apos;t really one place that brought everything about collecting together.
            </p>
            <p>
              The lingo is scattered across forums. Grading services are all over the map, each with their own
              quirks. And the cards themselves have gotten so much prettier, packed with tiny details that are easy
              to miss. Starting out can be a little daunting.
            </p>
            <p>Hopefully this is everything you need, all in one place.</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <SectionHeading className="mb-2">How the pricing works</SectionHeading>
          <p className="text-sm text-muted leading-relaxed">
            Every estimate is built from real eBay listings matched to the exact card, parallel, and grade — with a
            confidence level and a plain-English note explaining where the number came from. When there isn&apos;t
            enough real market data, that&apos;s disclosed too, rather than guessing with false precision.
          </p>
        </div>
      </div>
    </div>
  );
}
