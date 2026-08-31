"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { CardIdentity, Sport } from "@/lib/types";

const SPORTS: Sport[] = ["Baseball", "Basketball", "Football", "Hockey", "Soccer", "Other"];
const PLATFORM_OPTIONS = ["Whatnot", "eBay", "Facebook", "Store"];

const EMPTY_IDENTITY: CardIdentity = {
  player: "",
  sport: "Baseball",
  year: "",
  brand: "",
  setName: "",
  cardNumber: "",
  parallel: "",
  gradingCompany: "",
  grade: "",
  certNumber: "",
  isAutograph: false,
  autographCompany: "",
  autographGrade: "",
};

type Step = "upload" | "identifying" | "review" | "saving";

// Phone camera photos routinely run 3-4MB uncompressed at full resolution —
// sending both front and back together easily blows past Vercel's 4.5MB
// serverless request body cap (the deployed app failed identification with
// exactly that symptom). A card's fine print is legible well below full
// camera resolution, so downscale + re-encode before any upload.
async function compressImage(file: File, maxDimension = 1600, quality = 0.85): Promise<File> {
  if (file.size < 1_000_000) return file; // already small — skip the round trip through canvas

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) return file;

    return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
  } catch {
    // Decoding/canvas can fail for an unusual format — fall back to the
    // original file rather than blocking the scan entirely.
    return file;
  }
}

export default function ScanPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const backFileInputRef = useRef<HTMLInputElement>(null);
  const backCameraInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [backImageFile, setBackImageFile] = useState<File | null>(null);
  const [backPreviewUrl, setBackPreviewUrl] = useState<string | null>(null);
  const [identity, setIdentity] = useState<CardIdentity>(EMPTY_IDENTITY);
  const [identifyConfidence, setIdentifyConfidence] = useState<"high" | "medium" | "low">("medium");
  const [identifyNotes, setIdentifyNotes] = useState("");
  const [needsApiKey, setNeedsApiKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchasePlatform, setPurchasePlatform] = useState("");

  async function handleFile(file: File) {
    setError(null);
    const compressed = await compressImage(file);
    setImageFile(compressed);
    setPreviewUrl(URL.createObjectURL(compressed));
  }

  async function handleBackFile(file: File) {
    const compressed = await compressImage(file);
    setBackImageFile(compressed);
    setBackPreviewUrl(URL.createObjectURL(compressed));
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  async function identifyCard() {
    if (!imageFile) return;
    setStep("identifying");
    setError(null);
    try {
      const fd = new FormData();
      fd.append("image", imageFile);
      if (backImageFile) fd.append("backImage", backImageFile);
      const res = await fetch("/api/identify", { method: "POST", body: fd });
      const data = await res.json();

      if (data.needsApiKey) {
        setNeedsApiKey(true);
        setIdentity(EMPTY_IDENTITY);
        setStep("review");
        return;
      }
      if (data.error) {
        setError(data.error);
        setStep("upload");
        return;
      }

      const result = data.identity;
      setIdentity({
        player: result.player || "",
        sport: (SPORTS.includes(result.sport) ? result.sport : "Baseball") as Sport,
        year: result.year || "",
        brand: result.brand || "",
        setName: result.setName || "",
        cardNumber: result.cardNumber || "",
        parallel: result.parallel || "",
        gradingCompany: result.gradingCompany || "",
        grade: result.grade || "",
        certNumber: result.certNumber || "",
        isAutograph: Boolean(result.isAutograph),
        autographCompany: result.autographCompany || "",
        autographGrade: result.autographGrade || "",
      });
      setIdentifyConfidence(result.confidence || "medium");
      setIdentifyNotes(result.notes || "");
      setStep("review");
    } catch {
      setError("Could not reach the identification service. Try again.");
      setStep("upload");
    }
  }

  async function addToLibrary() {
    if (!identity.player.trim()) {
      setError("Player name is required.");
      return;
    }
    setStep("saving");
    setError(null);
    try {
      const fd = new FormData();
      if (imageFile) fd.append("image", imageFile);
      if (backImageFile) fd.append("backImage", backImageFile);
      fd.append("identity", JSON.stringify(identity));
      fd.append("identifyConfidence", identifyConfidence);
      fd.append("identifyNotes", identifyNotes);
      if (purchasePrice.trim()) fd.append("purchasePrice", purchasePrice.trim());
      if (purchaseDate) fd.append("purchaseDate", purchaseDate);
      if (purchasePlatform.trim()) fd.append("purchasePlatform", purchasePlatform.trim());
      const res = await fetch("/api/library", { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setStep("review");
        return;
      }
      router.push(`/card/${data.card.id}`);
    } catch {
      setError("Could not save this card. Try again.");
      setStep("review");
    }
  }

  function field<K extends keyof CardIdentity>(key: K) {
    return {
      value: identity[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setIdentity((prev) => ({ ...prev, [key]: e.target.value })),
    };
  }

  if (status === "loading") return null;

  if (!session) {
    return (
      <div className="mx-auto max-w-sm px-4 sm:px-6 py-24 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Sign in required</h1>
        <p className="text-muted text-sm mt-2">Only the collection owner can add cards.</p>
        <Link
          href="/login"
          className="mt-6 inline-block px-4 py-2.5 rounded-md bg-brand text-white hover:opacity-90 transition-opacity"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-bold tracking-tight mb-1">Add a Card</h1>
      <p className="text-muted text-sm mb-8">
        Upload a photo and we&apos;ll identify the card, then look up recent sales to estimate its value.
      </p>

      {error && (
        <div className="mb-6 rounded-lg border border-down/40 bg-down/10 px-4 py-3 text-sm text-down">{error}</div>
      )}

      {step === "upload" || step === "identifying" ? (
        <div className="space-y-6">
          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer rounded-xl border-2 border-dashed border-border bg-surface hover:border-accent-2/50 transition-colors p-10 text-center"
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Selected card" className="mx-auto max-h-72 rounded-lg object-contain" />
            ) : (
              <>
                <p className="text-4xl mb-3">📷</p>
                <p className="font-medium">Drop a card photo here, or click to choose one</p>
                <p className="text-muted text-sm mt-1">JPG or PNG, front of the card works best</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1 py-3 rounded-md border border-border text-foreground hover:bg-surface-2 transition-colors text-sm font-medium"
            >
              📷 Take Photo
            </button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>

          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-sm font-medium">
              Back of card <span className="text-muted font-normal">(optional)</span>
            </p>
            <p className="text-muted text-xs mt-0.5 mb-3">
              Helps confirm the set, card number, or a serial number the front doesn&apos;t show clearly.
            </p>
            {backPreviewUrl ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={backPreviewUrl} alt="Back of card" className="h-20 rounded-md object-contain border border-border" />
                <button
                  onClick={() => {
                    setBackImageFile(null);
                    setBackPreviewUrl(null);
                  }}
                  className="text-sm text-down hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => backFileInputRef.current?.click()}
                  className="flex-1 py-2 rounded-md border border-border text-sm hover:bg-surface-2 transition-colors"
                >
                  Choose Photo
                </button>
                <button
                  onClick={() => backCameraInputRef.current?.click()}
                  className="flex-1 py-2 rounded-md border border-border text-sm hover:bg-surface-2 transition-colors"
                >
                  📷 Take Photo
                </button>
              </div>
            )}
            <input
              ref={backFileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleBackFile(file);
              }}
            />
            <input
              ref={backCameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleBackFile(file);
              }}
            />
          </div>

          <button
            disabled={!imageFile || step === "identifying"}
            onClick={identifyCard}
            className="w-full py-3 rounded-md bg-brand text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {step === "identifying" ? "Identifying card…" : "Identify Card"}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {previewUrl && (
            <div className="flex items-center justify-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Front of card" className="max-h-56 rounded-lg object-contain" />
              {backPreviewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={backPreviewUrl} alt="Back of card" className="max-h-56 rounded-lg object-contain" />
              )}
            </div>
          )}

          {needsApiKey && (
            <div className="rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-accent">
              AI identification isn&apos;t configured yet (no <code>ANTHROPIC_API_KEY</code> set on the server). Fill in
              the card details below by hand — everything else still works.
            </div>
          )}
          {!needsApiKey && identifyNotes && (
            <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted">
              <span className="text-foreground font-medium">AI notes: </span>
              {identifyNotes}
            </div>
          )}

          <div className="rounded-xl border border-border bg-surface p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              Player *
              <input
                {...field("player")}
                required
                placeholder="e.g. Mike Trout"
                className="px-3 py-2 rounded-md bg-surface-2 border border-border focus:border-accent-2 outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Sport
              <select
                {...field("sport")}
                className="px-3 py-2 rounded-md bg-surface-2 border border-border focus:border-accent-2 outline-none"
              >
                {SPORTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Year
              <input
                {...field("year")}
                placeholder="e.g. 2011"
                className="px-3 py-2 rounded-md bg-surface-2 border border-border focus:border-accent-2 outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Brand
              <input
                {...field("brand")}
                placeholder="e.g. Topps"
                className="px-3 py-2 rounded-md bg-surface-2 border border-border focus:border-accent-2 outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Set
              <input
                {...field("setName")}
                placeholder="e.g. Chrome"
                className="px-3 py-2 rounded-md bg-surface-2 border border-border focus:border-accent-2 outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Card Number
              <input
                {...field("cardNumber")}
                placeholder="e.g. 193"
                className="px-3 py-2 rounded-md bg-surface-2 border border-border focus:border-accent-2 outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Parallel / Variant
              <input
                {...field("parallel")}
                placeholder="e.g. Base Rookie, Silver Prizm"
                className="px-3 py-2 rounded-md bg-surface-2 border border-border focus:border-accent-2 outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Grading Company
              <input
                {...field("gradingCompany")}
                placeholder="e.g. PSA (leave blank if raw)"
                className="px-3 py-2 rounded-md bg-surface-2 border border-border focus:border-accent-2 outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Grade
              <input
                {...field("grade")}
                placeholder="e.g. 10"
                className="px-3 py-2 rounded-md bg-surface-2 border border-border focus:border-accent-2 outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Cert # (from the slab label)
              <input
                {...field("certNumber")}
                placeholder="e.g. 55120539 (leave blank if raw)"
                className="px-3 py-2 rounded-md bg-surface-2 border border-border focus:border-accent-2 outline-none"
              />
            </label>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
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
                  <input
                    {...field("autographCompany")}
                    placeholder="e.g. PSA/DNA, JSA, Beckett Authentication"
                    className="px-3 py-2 rounded-md bg-surface-2 border border-border focus:border-accent-2 outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Autograph Grade
                  <input
                    {...field("autographGrade")}
                    placeholder="e.g. 10 (leave blank if not separately graded)"
                    className="px-3 py-2 rounded-md bg-surface-2 border border-border focus:border-accent-2 outline-none"
                  />
                </label>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
            <p className="text-sm font-medium">💰 Purchase Info (optional)</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="flex flex-col gap-1 text-sm">
                Price Paid
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="e.g. 45.00"
                  className="px-3 py-2 rounded-md bg-surface-2 border border-border focus:border-accent-2 outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Date Purchased
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="px-3 py-2 rounded-md bg-surface-2 border border-border focus:border-accent-2 outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Platform / Source
                <select
                  value={purchasePlatform}
                  onChange={(e) => setPurchasePlatform(e.target.value)}
                  className="px-3 py-2 rounded-md bg-surface-2 border border-border focus:border-accent-2 outline-none"
                >
                  <option value="">—</option>
                  {PLATFORM_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("upload")}
              className="px-4 py-3 rounded-md border border-border text-muted hover:text-foreground transition-colors"
            >
              Back
            </button>
            <button
              disabled={step === "saving"}
              onClick={addToLibrary}
              className="flex-1 py-3 rounded-md bg-brand text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {step === "saving" ? "Saving…" : "Get Valuation & Add to Nukes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
