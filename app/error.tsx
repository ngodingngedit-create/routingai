"use client";

import Link from "next/link";
import { useEffect } from "react";
import { buttonClass } from "@/components/ui";

const SCHEMA_HINT =
  "Skema database belum ada di database yang dipakai. Pastikan DIRECT_URL menunjuk database yang sama dengan DATABASE_URL, lalu jalankan prisma migrate deploy dan redeploy.";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);

  const message = error.message ?? "";
  const schemaMissing = message.includes("does not exist in the current database");

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-20">
      <h1 className="text-xl font-semibold tracking-tight text-text">Halaman ini gagal dimuat</h1>
      <p className="mt-2 text-sm text-muted">
        {schemaMissing
          ? SCHEMA_HINT
          : "Penyebab yang paling sering: database belum terhubung atau env var deployment belum lengkap."}
      </p>
      <p className="mt-2 text-sm text-muted">
        Cek
        <Link href="/api/health" className="mx-1 underline underline-offset-2 hover:text-text">
          /api/health
        </Link>
        untuk melihat env var mana yang kurang, database mana yang dipakai, dan tabel apa yang belum
        terpasang.
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-xs text-muted">Digest: {error.digest}</p>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className={buttonClass("primary", "md")}>
          Coba lagi
        </button>
        <Link href="/" className={buttonClass("outline", "md")}>
          Ke beranda
        </Link>
      </div>
    </div>
  );
}
