"use client";

import { useState } from "react";
import { CardIdentity, LibraryCard, Sport } from "@/lib/types";
import { getCertLookupUrl } from "@/lib/gradingLinks";
import { getSetInfoUrl } from "@/lib/platformLinks";
import { CopyCertButton } from "./CopyCertButton";

const SPORTS: Sport[] = ["Baseball", "Basketball", "Football", "Hockey", "Soccer", "Other"];

const inputClass = "px-3 py-2 rounded-md bg-surface-2 border border-border focus:border-accent-2 outline-none";

export function CardIdentityEditor({
  card,
  canEdit,
  onUpdate,
}: {
  card: LibraryCard;
  canEdit: boolean;
  onUpdate: (card: LibraryCard) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [identity, setIdentity] = useState<CardIdentity>(card);
  const [notes, setNotes] = useState(card.identifyNotes);
  const [extra, setExtra] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function field<K extends keyof CardIdentity>(key: K) {
    return {
      value: identity[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setIdentity((prev) => ({ ...prev, [key]: e.target.value })),
    };
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const mergedIdentity = { ...identity, parallel: [identity.parallel, extra.trim()].filter(Boolean).join(" ") };
      const res = await fetch(`/api/library/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...mergedIdentity, identifyNotes: notes }),
      });
      const data = await res.json();
      if (data.card) {
        onUpdate(data.card);
        setEditing(false);
      } else {
        setError(data.error || "Could not save changes.");
      }
    } catch {
      setError("Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            Player
            <input {...field("player")} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Sport
            <select {...field("sport")} className={inputClass}>
              {SPORTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Year
            <input {...field("year")} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Brand
            <input {...field("brand")} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Set
            <input {...field("setName")} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Card Number
            <input {...field("cardNumber")} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Parallel / Variant
            <input {...field("parallel")} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Other
            <input
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              placeholder="e.g. Color Match — appended onto Parallel when you save"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Grading Company
            <input {...field("gradingCompany")} placeholder="leave blank if raw" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Grade
            <input {...field("grade")} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Cert #
            <input {...field("certNumber")} className={inputClass} />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={identity.isAutograph}
            onChange={(e) =>
              setIdentity((prev) => ({
                ...prev,
                isAutograph: e.target.checked,
                ...(e.target.checked ? {} : { autographCompany: "", autographGrade: "" }),
              }))
            }
            className="accent-accent"
          />
          ✍️ Autographed
        </label>
        {identity.isAutograph && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm">
              Autograph Authenticator
              <input {...field("autographCompany")} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Autograph Grade
              <input {...field("autographGrade")} className={inputClass} />
            </label>
          </div>
        )}

        <label className="flex flex-col gap-1 text-sm">
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Anything worth remembering about this card"
            className={`${inputClass} resize-y`}
          />
        </label>

        {error && <p className="text-sm text-down">{error}</p>}

        <p className="text-xs text-muted">
          Saving doesn&apos;t change the estimated value — hit 🔄 Refresh on the valuation above afterward if this
          correction should affect it.
        </p>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setIdentity(card);
              setNotes(card.identifyNotes);
              setExtra("");
              setEditing(false);
              setError(null);
            }}
            disabled={saving}
            className="px-3 py-1.5 rounded-md border border-border text-muted hover:text-foreground transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || !identity.player.trim()}
            className="px-3 py-1.5 rounded-md bg-brand text-white hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    );
  }

  const title = [card.year, card.brand, card.setName].filter(Boolean).join(" ");
  const gradeLabel = card.gradingCompany && card.grade ? `${card.gradingCompany} ${card.grade}` : "Raw / Ungraded";
  const certUrl = getCertLookupUrl(card.gradingCompany, card.certNumber);

  return (
    <div>
      <p className="text-muted text-sm">
        {title || "Unknown set"}{" "}
        <a href={getSetInfoUrl(card)} target="_blank" rel="noopener noreferrer" className="text-accent-2 hover:underline">
          Set info ↗
        </a>
      </p>
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-4xl font-bold tracking-tight">{card.player}</h1>
        {canEdit && (
          <button
            onClick={() => {
              setIdentity(card);
              setNotes(card.identifyNotes);
              setExtra("");
              setEditing(true);
            }}
            className="mt-2 text-xs px-2.5 py-1 rounded-full border border-border text-muted hover:text-foreground transition-colors whitespace-nowrap"
          >
            ✏️ Edit Details
          </button>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        {card.cardNumber && <span className="px-2 py-1 rounded-full bg-surface-2 border border-border">#{card.cardNumber}</span>}
        {card.parallel && <span className="px-2 py-1 rounded-full bg-surface-2 border border-border">{card.parallel}</span>}
        {certUrl ? (
          <a
            href={certUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 rounded-full bg-accent/15 text-accent border border-accent/30 font-medium hover:bg-accent/25 transition-colors"
          >
            ✓ {gradeLabel} ↗
          </a>
        ) : (
          <span className="px-2 py-1 rounded-full bg-surface-2 border border-border">{gradeLabel}</span>
        )}
        {card.certNumber && <CopyCertButton certNumber={card.certNumber} />}
        <span className="px-2 py-1 rounded-full bg-surface-2 border border-border">{card.sport}</span>
        {card.isAutograph && (
          <span className="px-2 py-1 rounded-full bg-accent/15 text-accent border border-accent/30 font-medium">
            ✍️ {[card.autographCompany, card.autographGrade && `Auto ${card.autographGrade}`].filter(Boolean).join(" ") || "Autographed"}
          </span>
        )}
      </div>
    </div>
  );
}
