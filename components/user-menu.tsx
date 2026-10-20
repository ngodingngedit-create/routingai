"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

type Props = {
  name: string;
  email: string;
  isAdmin: boolean;
};

export function UserMenu({ name, email, isAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const initials = name.trim().slice(0, 1).toUpperCase() || email.slice(0, 1).toUpperCase();

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-9 items-center gap-2 rounded-[6px] border border-line px-2 text-sm text-muted transition-colors hover:border-line-strong hover:text-text"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-[4px] bg-accent-soft text-[11px] font-semibold text-accent">
          {initials}
        </span>
        <span className="hidden max-w-[140px] truncate sm:inline">{name || email}</span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 rounded-[10px] border border-line bg-surface p-1 shadow-lg shadow-black/10"
        >
          <div className="border-b border-line px-3 py-2">
            <p className="truncate text-sm text-text">{name || "Pengguna"}</p>
            <p className="truncate text-xs text-muted">{email}</p>
          </div>
          <Link
            href="/dashboard"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block rounded-[6px] px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            Panel saya
          </Link>
          {isAdmin ? (
            <Link
              href="/admin"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block rounded-[6px] px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-text"
            >
              Panel admin
            </Link>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              await signOut();
              router.push("/");
              router.refresh();
            }}
            className="block w-full rounded-[6px] px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            Keluar
          </button>
        </div>
      ) : null}
    </div>
  );
}
