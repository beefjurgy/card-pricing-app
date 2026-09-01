import Link from "next/link";
import { Logo } from "./Logo";

// Placeholder for the future multi-user build — no real BeefyNukes social
// profiles exist yet, so these link to the platforms' own homepages rather
// than a fabricated profile URL. Swap in the real profile links once
// accounts exist.
function SocialIcons() {
  return (
    <div className="flex items-center gap-4">
      <a
        href="https://www.instagram.com/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Instagram (coming soon)"
        className="text-background/60 hover:text-background transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="2" width="20" height="20" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      </a>
      <a
        href="https://www.tiktok.com/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="TikTok (coming soon)"
        className="text-background/60 hover:text-background transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16.6 5.82c-.9-.88-1.44-2.06-1.5-3.32h-3.1v13.3c0 1.52-1.24 2.76-2.76 2.76a2.76 2.76 0 0 1 0-5.52c.27 0 .53.04.78.11V9.9a5.9 5.9 0 0 0-.78-.05 5.9 5.9 0 1 0 5.9 5.9V9.15a7.6 7.6 0 0 0 4.46 1.44V7.5a3.8 3.8 0 0 1-3-1.68z" />
        </svg>
      </a>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="bg-accent-2 text-background">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 grid sm:grid-cols-3 gap-8 text-sm">
        <div>
          <div className="flex items-center gap-2">
            <Logo size={24} />
            <span className="font-bold tracking-tight">
              Beefy<span className="text-brand">Nukes</span>
            </span>
          </div>
          <p className="text-background/70 mt-2 leading-relaxed">Everything about your collection in one place.</p>
          <div className="mt-4">
            <SocialIcons />
          </div>
        </div>

        <div>
          <p className="font-medium uppercase tracking-wide text-xs text-background/50 mb-3">How the estimates work</p>
          <p className="text-background/70 leading-relaxed">
            Valuations are estimates based on live eBay listings and other public data sources — not appraisals or
            financial advice.
          </p>
        </div>

        <div>
          <p className="font-medium uppercase tracking-wide text-xs text-background/50 mb-3">Navigate</p>
          <div className="flex flex-col gap-2">
            <Link href="/" className="text-background/80 hover:text-background transition-colors">
              My Collection
            </Link>
            <Link href="/portfolio" className="text-background/80 hover:text-background transition-colors">
              Portfolio
            </Link>
            <Link href="/vocabulary" className="text-background/80 hover:text-background transition-colors">
              Lingo
            </Link>
            <Link href="/about" className="text-background/80 hover:text-background transition-colors">
              About
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-background/10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 text-xs text-background/50 text-center">
          BeefyNukes 2026. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
