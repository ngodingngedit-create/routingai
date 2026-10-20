"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Ringkasan" },
  { href: "/admin/users", label: "Pengguna" },
  { href: "/admin/providers", label: "Provider" },
  { href: "/admin/models", label: "Model" },
  { href: "/admin/orders", label: "Top up" },
  { href: "/admin/requests", label: "Request" },
  { href: "/admin/settings", label: "Pengaturan" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigasi admin" className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {NAV.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "rounded-[6px] bg-accent-soft px-3 py-2 text-sm font-medium text-accent"
                : "rounded-[6px] px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-text"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
