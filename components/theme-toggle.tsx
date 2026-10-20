"use client";

import { useState } from "react";

type Theme = "dark" | "light";

export function ThemeToggle() {
  const [pending, setPending] = useState(false);

  const toggle = () => {
    const current = (document.documentElement.getAttribute("data-theme") as Theme) ?? "dark";
    const next: Theme = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("routingai-theme", next);
    } catch {
      // storage diblokir browser, tema tetap berubah untuk sesi ini
    }
    setPending(true);
    setTimeout(() => setPending(false), 150);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Ganti tema gelap dan terang"
      className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-line text-muted transition-colors hover:border-line-strong hover:text-text"
    >
      <svg
        viewBox="0 0 20 20"
        className={`h-4 w-4 ${pending ? "opacity-60" : ""}`}
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="10" cy="10" r="6.5" />
        <path d="M10 3.5a6.5 6.5 0 0 1 0 13Z" fill="currentColor" stroke="none" />
      </svg>
    </button>
  );
}
