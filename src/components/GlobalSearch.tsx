"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

// The one search bar for the whole app — same look and behavior as the
// old My Collection-only box, just persistent above every page's content
// instead of duplicated in a separate nav widget. On "/" it live-filters
// exactly like before (merging into whatever other filters are already in
// the URL); from anywhere else, submitting navigates to "/" with the query
// applied.
export function GlobalSearch() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const [value, setValue] = useState(urlQuery);

  useEffect(() => {
    setValue(urlQuery);
  }, [urlQuery]);

  if (!session) return null;

  function commit(next: string) {
    const params = new URLSearchParams(pathname === "/" ? searchParams.toString() : "");
    if (next.trim()) params.set("q", next.trim());
    else params.delete("q");
    const query = params.toString();
    router.replace(query ? `/?${query}` : "/", { scroll: false });
  }

  return (
    <div className="border-b border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3">
        <div className="relative max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm pointer-events-none">🔍</span>
          <input
            type="search"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (pathname === "/") commit(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && pathname !== "/") commit(value);
            }}
            placeholder="Search player, set, brand, year…"
            className="w-full pl-9 pr-3 py-2 rounded-md bg-surface-2 border border-border text-sm text-foreground placeholder:text-muted focus:border-accent-2 outline-none"
          />
        </div>
      </div>
    </div>
  );
}
