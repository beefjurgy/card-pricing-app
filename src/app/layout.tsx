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
          <header className="border-b border-border">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2">
                <Logo size={32} />
                <span className="flex items-baseline gap-2">
                  <span className="text-xl font-bold tracking-tight">
                    Beefy<span className="text-brand">Nukes</span>
                  </span>
                  <span className="hidden sm:inline text-xs text-muted italic">
                    Everything you want to know about your collection.
                  </span>
                </span>
              </Link>
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
          </footer>
        </Providers>
      </body>
    </html>
  );
}
