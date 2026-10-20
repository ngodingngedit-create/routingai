"use client";

import { useState } from "react";
import { signInWithGoogle } from "@/lib/auth-client";

export function LoginButton({ callbackURL, disabled, reason }: { callbackURL: string; disabled?: boolean; reason?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setPending(true);
    setError(null);
    const result = await signInWithGoogle(callbackURL);
    if (result?.error) {
      setPending(false);
      setError(result.error.message ?? "Gagal masuk. Coba lagi.");
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || pending}
        className="inline-flex h-10 w-full items-center justify-center gap-3 rounded-[6px] bg-accent px-4 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4Z"
          />
          <path
            fill="#34A853"
            d="M12 22c2.7 0 4.9-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1a5.9 5.9 0 0 1-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z"
          />
          <path fill="#FBBC05" d="M6.4 14a6 6 0 0 1 0-3.9V7.5H3.1a10 10 0 0 0 0 9L6.4 14Z" />
          <path
            fill="#EA4335"
            d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.9 5.5l3.3 2.6A5.9 5.9 0 0 1 12 5.9Z"
          />
        </svg>
        {pending ? "Menghubungkan ke Google..." : "Masuk dengan Google"}
      </button>
      {disabled ? (
        <p className="mt-3 text-xs text-danger">{reason}</p>
      ) : error ? (
        <p className="mt-3 text-xs text-danger">{error}</p>
      ) : null}
    </div>
  );
}
