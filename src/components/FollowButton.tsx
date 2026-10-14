"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export function FollowButton({
  username,
  onFollowersChange,
}: {
  username: string;
  // Lets a parent showing a separate follower count (e.g. a profile stats
  // row) stay in sync when the viewer follows/unfollows, without both
  // components independently fetching the same endpoint.
  onFollowersChange?: (followers: number) => void;
}) {
  const { data: session } = useSession();
  const [state, setState] = useState<{ isFollowing: boolean; followers: number } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/users/${username}/follow`)
      .then((r) => r.json())
      .then((data: { isFollowing: boolean; followers: number }) => {
        if (!cancelled) {
          setState({ isFollowing: data.isFollowing, followers: data.followers });
          onFollowersChange?.(data.followers);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  async function toggle() {
    if (!state || busy) return;
    setBusy(true);
    const method = state.isFollowing ? "DELETE" : "POST";
    try {
      const res = await fetch(`/api/users/${username}/follow`, { method });
      const data = await res.json();
      setState({ isFollowing: data.isFollowing, followers: data.followers });
      onFollowersChange?.(data.followers);
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
        state.isFollowing
          ? "bg-surface-2 border border-border text-muted hover:text-down"
          : "bg-accent-2 text-white hover:opacity-90"
      }`}
    >
      {state.isFollowing ? "Following" : "Follow"}
    </button>
  );
}
