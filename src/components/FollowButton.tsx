"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export function FollowButton({ username }: { username: string }) {
  const { data: session } = useSession();
  const [state, setState] = useState<{ following: boolean; followers: number } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/users/${username}/follow`)
      .then((r) => r.json())
      .then((data: { following: boolean; followers: number }) => {
        if (!cancelled) setState({ following: data.following, followers: data.followers });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [username]);

  async function toggle() {
    if (!state || busy) return;
    setBusy(true);
    const method = state.following ? "DELETE" : "POST";
    try {
      const res = await fetch(`/api/users/${username}/follow`, { method });
      const data = await res.json();
      setState({ following: data.following, followers: data.followers });
    } finally {
      setBusy(false);
    }
  }

  if (!session || !state) return null;

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors disabled:opacity-50 ${
        state.following
          ? "bg-surface-2 border border-border text-muted hover:text-down"
          : "bg-accent-2 text-white hover:opacity-90"
      }`}
    >
      {state.following ? "Following" : "Follow"}
    </button>
  );
}
