"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Ringkasan" },
  { href: "/dashboard/api-keys", label: "Kunci API" },
  { href: "/dashboard/playground", label: "Playground" },
  { href: "/dashboard/usage", label: "Pemakaian" },
  { href: "/dashboard/billing", label: "Saldo" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigasi panel" className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
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
