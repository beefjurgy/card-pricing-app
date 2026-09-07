"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

// Reuses the same search (player/set/brand/year) already built into the
// home page's own search box — submitting here just navigates to "/" with
// the query applied, rather than duplicating the filter logic anywhere
// else. Owner-only: a logged-out visitor has no "My Collection" to search.
export function HeaderSearch() {
  const { data: session } = useSession();
  const router = useRouter();
  const [value, setValue] = useState("");

  if (!session) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    router.push(q ? `/?q=${encodeURIComponent(q)}` : "/");
  }

  return (
    <form onSubmit={handleSubmit} className="relative hidden md:block w-48 lg:w-72">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm pointer-events-none">🔍</span>
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search player, set, brand, year…"
        className="w-full pl-9 pr-3 py-2 rounded-md bg-surface-2 border border-border text-sm text-foreground placeholder:text-muted focus:border-accent-2 outline-none"
      />
    </form>
  );
}
