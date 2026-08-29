"use client";

import { useState } from "react";

export function CopyCertButton({ certNumber }: { certNumber: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(certNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable or permission denied — nothing reasonable
      // to fall back to, so this just silently stays a no-op.
    }
  }

  return (
    <button
      onClick={handleCopy}
      title={`Copy cert number ${certNumber}`}
      className="px-2 py-1 rounded-full bg-surface-2 border border-border text-muted hover:text-foreground hover:border-accent-2/50 transition-colors"
    >
      {copied ? "✓ Copied" : `📋 ${certNumber}`}
    </button>
  );
}
