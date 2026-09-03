"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { SectionHeading } from "./SectionHeading";

interface Comment {
  id: string;
  authorId: string;
  authorUsername: string | null;
  authorAvatarUrl: string | null;
  body: string;
  createdAt: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Shared between a card's own comment thread and a public profile's —
// same shape either way, just pointed at a different API base
// (/api/library/[id]/comments or /api/users/[username]/comments).
export function CommentThread({
  apiBase,
  canModerate,
}: {
  apiBase: string;
  // The card/profile owner can delete any comment on their own page, not
  // just their own — same "owner moderates their own space" idea as the
  // Featured toggle and the public/private card toggle.
  canModerate: boolean;
}) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(apiBase)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setComments(data.comments ?? []);
      })
      .catch(() => {
        if (!cancelled) setComments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || posting) return;
    setPosting(true);
    setError(null);
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not post comment.");
      setComments((prev) => [...(prev ?? []), data.comment]);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post comment.");
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(id: string) {
    setComments((prev) => prev?.filter((c) => c.id !== id) ?? null);
    try {
      await fetch(`${apiBase}/${id}`, { method: "DELETE" });
    } catch {
      // Best-effort — a failed delete just means it reappears on next load.
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <SectionHeading className="mb-3">Comments</SectionHeading>

      {!comments ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted mb-4">No comments yet.</p>
      ) : (
        <div className="space-y-4 mb-4">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2.5">
              {c.authorAvatarUrl ? (
                <Image src={c.authorAvatarUrl} alt="" width={28} height={28} className="w-7 h-7 rounded-full object-cover shrink-0" unoptimized />
              ) : (
                <div className="w-7 h-7 rounded-full bg-surface-2 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted">
                  @{c.authorUsername ?? "user"} · {formatDate(c.createdAt)}
                </p>
                <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">{c.body}</p>
              </div>
              {(session?.user?.id === c.authorId || canModerate) && (
                <button
                  onClick={() => handleDelete(c.id)}
                  className="text-xs text-muted hover:text-down transition-colors shrink-0"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {session ? (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment…"
            maxLength={1000}
            className="flex-1 px-3 py-2 rounded-md bg-surface-2 border border-border text-sm focus:border-accent-2 outline-none"
          />
          <button
            type="submit"
            disabled={posting || !text.trim()}
            className="px-4 py-2 rounded-md bg-accent-2 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Post
          </button>
        </form>
      ) : (
        <p className="text-xs text-muted">Sign in to leave a comment.</p>
      )}
      {error && <p className="text-xs text-down mt-2">{error}</p>}
    </div>
  );
}
