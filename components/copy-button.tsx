"use client";

import { useState } from "react";

export function CopyButton({ value, label = "Salin" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-[6px] border border-line px-2 py-1 text-xs text-muted transition-colors hover:border-line-strong hover:text-text"
    >
      {copied ? "Tersalin" : label}
    </button>
  );
}
