import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { RandomCardButton } from "@/components/RandomCardButton";
import { AuthHeaderControl } from "@/components/AuthHeaderControl";
import { Footer } from "@/components/Footer";
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
  title: "Card Nukes — Sports Card Pricing",
  description: "Scan sports cards into your nukes and track valuations from recent sales.",
  appleWebApp: {
    title: "Card Nukes",
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
                    Card<span className="text-brand">Nukes</span>
                  </span>
                </Link>
                <span className="hidden sm:inline text-xs text-muted">
                  Everything about your collection in one place.
                </span>
              </div>
              <nav className="flex items-center gap-1 text-sm">
                <RandomCardButton />
                <AuthHeaderControl />
              </nav>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
