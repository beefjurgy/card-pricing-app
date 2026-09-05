"use client";

import { useEffect, useState } from "react";
import { CardIdentity } from "@/lib/types";
import { SectionHeading } from "./SectionHeading";

export function SetInfoCard({ identity }: { identity: CardIdentity }) {
  const [blurb, setBlurb] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setBlurb(undefined);
    fetch("/api/set-info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: identity.year, brand: identity.brand, setName: identity.setName, sport: identity.sport }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setBlurb(data.blurb ?? null);
      })
      .catch(() => {
        if (!cancelled) setBlurb(null);
      });
    return () => {
      cancelled = true;
    };
  }, [identity.year, identity.brand, identity.setName, identity.sport]);

  // No preamble while loading (avoids a flash of an empty card on every
  // page view) and no card at all if generation genuinely failed/isn't
  // configured — same empty-state suppression as PlayerBuzz's news list.
  if (blurb === null) return null;

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <SectionHeading className="mb-3">About This Set</SectionHeading>
      {blurb === undefined ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <p className="text-sm text-muted leading-relaxed">{blurb}</p>
      )}
    </div>
  );
}
