import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { NeonHttpAdapter } from "@/lib/authAdapter";

// Invite-only gate for now: an allowlist of specific emails, not an open
// signup product yet. Rejecting here (rather than after login) means a
// non-allowed sign-in attempt never creates a user/account/session row at
// all — no orphaned data to clean up. ALLOWED_EMAILS is a comma-separated
// list of beta testers on top of the original single OWNER_EMAIL, so
// existing deployments don't need that var touched to add invitees. This
// is the ONE thing that changes when open signup arrives later; everywhere
// else already compares session.user.id against a card's own userId
// rather than just checking "is anyone logged in," so it's already
// correct for that future.
const OWNER_EMAIL = process.env.OWNER_EMAIL?.toLowerCase();
const ALLOWED_EMAILS = new Set(
  (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);
if (OWNER_EMAIL) ALLOWED_EMAILS.add(OWNER_EMAIL);

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
      const email = profile?.email?.toLowerCase();
      // Google's own `email_verified` flag, not just presence of an email —
      // defense in depth against an unverified address matching by coincidence.
      return Boolean(email && ALLOWED_EMAILS.has(email) && profile?.email_verified);
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
