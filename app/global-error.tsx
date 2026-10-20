"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0C0E10",
          color: "#E9ECEE",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 520 }}>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "#FF6A2B",
            }}
          >
            RoutingAI
          </p>
          <h1 style={{ margin: "12px 0 0", fontSize: 22, fontWeight: 600 }}>
            Aplikasi gagal memuat
          </h1>
          <p style={{ margin: "10px 0 0", fontSize: 14, lineHeight: 1.6, color: "#98A2AB" }}>
            Penyebab yang paling sering: <code>DATABASE_URL</code> belum diisi di environment
            deployment, atau <code>DIRECT_URL</code> menunjuk database lain sehingga migrasi tidak
            pernah jalan. Cek{" "}
            <a href="/api/health" style={{ color: "#FF6A2B" }}>
              /api/health
            </a>{" "}
            untuk melihat env var mana yang belum ada, database mana yang dipakai, dan tabel apa yang
            belum terpasang.
          </p>
          {error.digest ? (
            <p style={{ margin: "12px 0 0", fontSize: 12, color: "#6B747C" }}>Digest: {error.digest}</p>
          ) : null}
          <div style={{ marginTop: 24, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                height: 40,
                padding: "0 16px",
                borderRadius: 6,
                border: 0,
                background: "#FF6A2B",
                color: "#17110C",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Coba lagi
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- global-error menggantikan root layout, jadi pakai reload penuh */}
            <a
              href="/"
              style={{
                height: 40,
                padding: "0 16px",
                borderRadius: 6,
                border: "1px solid #23282D",
                color: "#E9ECEE",
                fontSize: 14,
                display: "inline-flex",
                alignItems: "center",
                textDecoration: "none",
              }}
            >
              Ke beranda
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
