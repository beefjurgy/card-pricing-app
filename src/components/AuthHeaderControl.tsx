"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export function AuthHeaderControl() {
  const { data: session, status } = useSession();

  if (status === "loading") return null;

  if (!session) {
    return (
      <Link href="/login" className="px-3 py-2 rounded-md text-muted hover:text-foreground transition-colors">
        Sign in
      </Link>
    );
  }

  return (
    <>
      <Link
        href="/scan"
        className="px-3 py-2 rounded-md bg-brand text-white font-medium hover:opacity-90 transition-opacity"
      >
        + Add Card
      </Link>
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="px-3 py-2 rounded-md text-muted hover:text-foreground transition-colors"
      >
        Sign out
      </button>
    </>
  );
}
