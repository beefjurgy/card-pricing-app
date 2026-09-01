"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";

export default function AccountPage() {
  const { data: session, status, update } = useSession();
  const [value, setValue] = useState(session?.user?.username ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  if (status === "loading") return null;

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 sm:px-6 py-16 text-center">
        <p className="text-muted mb-4">Sign in to manage your account.</p>
        <Link href="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/account/username", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update username.");
      await update({ username: data.username });
      setValue(data.username);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update username.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarUploading(true);
    setAvatarError(null);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/account/avatar", { method: "PATCH", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not upload photo.");
      await update({ avatarUrl: data.avatarUrl });
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Could not upload photo.");
    } finally {
      setAvatarUploading(false);
    }
  }

  const currentUsername = session.user.username;
  const avatarPreview = session.user.avatarUrl ?? session.user.image;

  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Account</h1>
      <p className="text-muted text-sm mb-6">{session.user.email}</p>

      <div className="flex items-center gap-4 mb-8">
        {avatarPreview ? (
          <Image src={avatarPreview} alt="" width={64} height={64} className="rounded-full" unoptimized />
        ) : (
          <div className="w-16 h-16 rounded-full bg-surface-2 border border-border" />
        )}
        <div>
          <label className="inline-block px-3 py-1.5 rounded-md border border-border text-sm cursor-pointer hover:bg-surface-2 transition-colors">
            {avatarUploading ? "Uploading…" : "Change photo"}
            <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={avatarUploading} className="hidden" />
          </label>
          {avatarError && <p className="text-xs text-down mt-1">{avatarError}</p>}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block text-sm font-medium">Username</label>
        <div className="flex items-center gap-2">
          <span className="text-muted">@</span>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value.toLowerCase())}
            placeholder="yourname"
            maxLength={20}
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <p className="text-xs text-muted">3-20 characters: lowercase letters, numbers, and underscores.</p>
        {error && <p className="text-xs text-down">{error}</p>}
        {saved && !error && <p className="text-xs text-up">Saved.</p>}
        <button
          type="submit"
          disabled={saving || value === currentUsername}
          className="px-4 py-2 rounded-md bg-accent-2 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </form>

      {currentUsername && (
        <p className="text-sm text-muted mt-6">
          Public profile:{" "}
          <Link href={`/u/${currentUsername}`} className="text-accent hover:underline">
            cardnukes.com/u/{currentUsername} ↗
          </Link>
        </p>
      )}
    </div>
  );
}
