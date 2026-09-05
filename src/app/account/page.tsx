"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";

const BIO_MAX_LENGTH = 280;

export default function AccountPage() {
  const { data: session, status, update } = useSession();
  const [value, setValue] = useState(session?.user?.username ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [bio, setBioValue] = useState("");
  const [savedBio, setSavedBio] = useState("");
  const [bioSaving, setBioSaving] = useState(false);
  const [bioError, setBioError] = useState<string | null>(null);
  const [bioSaved, setBioSaved] = useState(false);

  useEffect(() => {
    if (!session) return;
    fetch("/api/account/bio")
      .then((r) => r.json())
      .then((data) => {
        setBioValue(data.bio ?? "");
        setSavedBio(data.bio ?? "");
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

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

  const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
  const MAX_BYTES = 4 * 1024 * 1024;

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarError(null);
    // HEIC photos (the default on iPhone/Mac Photos) upload "successfully"
    // but can't be decoded by most browsers' <img> tags — reject up front
    // with a clear message instead of a silent broken image.
    if (!ALLOWED_TYPES.has(file.type)) {
      setAvatarError("That photo format isn't supported. Try a JPG, PNG, or WEBP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setAvatarError("That photo is too large. Please use one under 4MB.");
      return;
    }
    setAvatarUploading(true);
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

  async function handleSaveBio(e: React.FormEvent) {
    e.preventDefault();
    setBioSaving(true);
    setBioError(null);
    setBioSaved(false);
    try {
      const res = await fetch("/api/account/bio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save bio.");
      setBioValue(data.bio ?? "");
      setSavedBio(data.bio ?? "");
      setBioSaved(true);
    } catch (err) {
      setBioError(err instanceof Error ? err.message : "Could not save bio.");
    } finally {
      setBioSaving(false);
    }
  }

  async function handleRemoveAvatar() {
    setAvatarError(null);
    setAvatarUploading(true);
    try {
      const res = await fetch("/api/account/avatar", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not remove photo.");
      await update({ avatarUrl: null });
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Could not remove photo.");
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
          <Image src={avatarPreview} alt="" width={64} height={64} className="w-16 h-16 rounded-full object-cover" unoptimized />
        ) : (
          <div className="w-16 h-16 rounded-full bg-surface-2 border border-border" />
        )}
        <div>
          <div className="flex items-center gap-3">
            <label className="inline-block px-3 py-1.5 rounded-md border border-border text-sm cursor-pointer hover:bg-surface-2 transition-colors">
              {avatarUploading ? "Working…" : "Change photo"}
              <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={avatarUploading} className="hidden" />
            </label>
            {session.user.avatarUrl && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={avatarUploading}
                className="text-sm text-muted hover:text-foreground transition-colors disabled:opacity-50"
              >
                Remove
              </button>
            )}
          </div>
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

      <form onSubmit={handleSaveBio} className="space-y-3 mt-8">
        <label className="block text-sm font-medium">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBioValue(e.target.value.slice(0, BIO_MAX_LENGTH))}
          placeholder="Tell people a bit about your collection…"
          rows={4}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent resize-none"
        />
        <p className="text-xs text-muted">
          {bio.length}/{BIO_MAX_LENGTH} — shown on your public profile.
        </p>
        {bioError && <p className="text-xs text-down">{bioError}</p>}
        {bioSaved && !bioError && <p className="text-xs text-up">Saved.</p>}
        <button
          type="submit"
          disabled={bioSaving || bio === savedBio}
          className="px-4 py-2 rounded-md bg-accent-2 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {bioSaving ? "Saving…" : "Save"}
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
