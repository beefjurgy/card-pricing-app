import Link from "next/link";
import { SectionHeading } from "@/components/SectionHeading";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <Link href="/" className="text-muted hover:text-foreground text-sm">
        ← Nukes
      </Link>

      <h1 className="text-3xl font-bold tracking-tight mt-4">About BeefyNukes</h1>
      <p className="text-muted text-sm mt-1">Everything you want to know about your collection.</p>

      <div className="mt-8 space-y-6">
        <div className="rounded-xl border border-border bg-surface p-5">
          <SectionHeading className="mb-2">What this is</SectionHeading>
          <p className="text-sm text-muted leading-relaxed">
            BeefyNukes is a personal sports and trading card collection tracker. Snap a photo of a card and it gets
            identified — player, set, parallel, grading — and priced using real, current market listings rather than
            a static price guide.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <SectionHeading className="mb-2">How the pricing works</SectionHeading>
          <p className="text-sm text-muted leading-relaxed">
            Every estimate is built from real eBay listings matched to the exact card, parallel, and grade — with a
            confidence level and a plain-English note explaining where the number came from. When there isn&apos;t
            enough real market data, that&apos;s disclosed too, rather than guessing with false precision.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <SectionHeading className="mb-2">Where it's headed</SectionHeading>
          <p className="text-sm text-muted leading-relaxed">
            This started as, and still is, one collector&apos;s personal tool — actively being built and refined.
            It&apos;s not a company or a finished product yet, just something built to actually be useful for
            tracking and understanding a real collection.
          </p>
        </div>
      </div>
    </div>
  );
}
