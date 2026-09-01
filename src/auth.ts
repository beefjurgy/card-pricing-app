import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { NeonHttpAdapter } from "@/lib/authAdapter";

// Single-owner gate for now: this is a personal collection, not an open
// signup product yet. Rejecting here (rather than after login) means a
// non-owner sign-in attempt never creates a user/account/session row at
// all — no orphaned data to clean up. This is the ONE thing that changes
// when real multi-user signup opens later; everywhere else already
// compares session.user.id against a card's own userId rather than just
// checking "is anyone logged in," so it's already correct for that future.
const OWNER_EMAIL = process.env.OWNER_EMAIL?.toLowerCase();

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: NeonHttpAdapter(),
  session: { strategy: "database" },
  providers: [Google],
  // Auth.js is conservative by default about trusting the request's host
  // header when constructing OAuth redirect/callback URLs — needed here
  // since this runs behind Vercel's proxy rather than a bare Node server.
  trustHost: true,
  callbacks: {
    async signIn({ profile }) {
      if (!OWNER_EMAIL) return false;
      const email = profile?.email?.toLowerCase();
      // Google's own `email_verified` flag, not just presence of an email —
      // defense in depth against an unverified address matching by coincidence.
      return Boolean(email && email === OWNER_EMAIL && profile?.email_verified);
    },
    async session({ session, user }) {
      if (session.user) {
        const u = user as { username?: string | null; avatarUrl?: string | null };
        session.user.id = user.id;
        session.user.username = u.username ?? null;
        session.user.avatarUrl = u.avatarUrl ?? null;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
});
