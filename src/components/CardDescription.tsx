"use client";

import { useState } from "react";
import { CardIdentity } from "@/lib/types";
import { SectionHeading } from "./SectionHeading";

type Voice = "simmons" | "berman" | "madden" | "costas";

const VOICE_LABELS: Record<Voice, string> = {
  simmons: "Simmons",
  berman: "Berman",
  madden: "Madden",
  costas: "Costas",
};

export function CardDescription({ identity }: { identity: CardIdentity }) {
  const [description, setDescription] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsApiKey, setNeedsApiKey] = useState(false);
  const [voice, setVoice] = useState<Voice>("simmons");

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...identity, voice }),
      });
      const data = await res.json();
      if (data.needsApiKey) {
        setNeedsApiKey(true);
      } else if (data.error) {
        setError(data.error);
      } else {
        setDescription(data.description);
      }
    } catch {
      setError("Could not reach the description generator.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between mb-3 gap-3">
        <SectionHeading>Card Description</SectionHeading>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-border overflow-hidden text-xs">
            {(Object.keys(VOICE_LABELS) as Voice[]).map((v) => (
              <button
                key={v}
                onClick={() => setVoice(v)}
                className={`px-2.5 py-1 transition-colors ${
                  voice === v ? "bg-brand text-white" : "text-muted hover:bg-surface-2"
                }`}
              >
                {VOICE_LABELS[v]}
              </button>
            ))}
          </div>
          <button
            onClick={generate}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-surface-2 transition-colors disabled:opacity-40 whitespace-nowrap"
          >
            {loading ? "Writing…" : description ? "🎲 Regenerate" : "✨ Generate"}
          </button>
        </div>
      </div>

      {needsApiKey && (
        <p className="text-sm text-muted">
          AI description isn&apos;t configured (no <code>ANTHROPIC_API_KEY</code>) — this feature needs it to work.
        </p>
      )}
      {error && <p className="text-sm text-down">{error}</p>}
      {!needsApiKey && !error && !description && !loading && (
        <p className="text-sm text-muted">Get a fun, AI-written blurb for this card.</p>
      )}
      {description && <p className="text-sm italic">&ldquo;{description}&rdquo;</p>}
    </div>
  );
}
