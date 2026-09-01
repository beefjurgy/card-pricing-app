import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { RandomCardButton } from "@/components/RandomCardButton";
import { AuthHeaderControl } from "@/components/AuthHeaderControl";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Beefy Nukes — Sports Card Pricing",
  description: "Scan sports cards into your nukes and track valuations from recent sales.",
  appleWebApp: {
    title: "Beefy Nukes",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          <header className="sticky top-0 z-40 border-b border-border bg-background">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link href="/" className="flex items-center gap-2">
                  <Logo size={32} />
                  <span className="text-xl font-bold tracking-tight">
                    Beefy<span className="text-brand">Nukes</span>
                  </span>
                </Link>
                <span className="hidden sm:inline text-xs text-muted">
                  Everything you want to know about your collection.
                </span>
              </div>
              <nav className="flex items-center gap-1 text-sm">
                <RandomCardButton />
                <AuthHeaderControl />
              </nav>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="border-t border-border py-6 text-center text-xs text-muted space-y-2">
            <p>Valuations are estimates based on live eBay listings and other public data sources — not appraisals or financial advice.</p>
            <p>
              <Link href="/vocabulary" className="hover:text-foreground">
                <span className="inline-block font-medium bg-gradient-to-r from-accent-2/30 to-accent-2/30 bg-no-repeat [background-size:100%_40%] [background-position:0_82%]">
                  Lingo
                </span>
              </Link>
            </p>
            {/* Placeholder for the future multi-user build — no real
                BeefyNukes profiles exist yet, so these link to the
                platforms' own homepages rather than a fabricated profile
                URL. Swap in the real profile links once accounts exist. */}
            <p className="flex items-center justify-center gap-4">
              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram (coming soon)"
                className="text-muted hover:text-foreground transition-colors"
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
                className="text-muted hover:text-foreground transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.6 5.82c-.9-.88-1.44-2.06-1.5-3.32h-3.1v13.3c0 1.52-1.24 2.76-2.76 2.76a2.76 2.76 0 0 1 0-5.52c.27 0 .53.04.78.11V9.9a5.9 5.9 0 0 0-.78-.05 5.9 5.9 0 1 0 5.9 5.9V9.15a7.6 7.6 0 0 0 4.46 1.44V7.5a3.8 3.8 0 0 1-3-1.68z" />
                </svg>
              </a>
            </p>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
