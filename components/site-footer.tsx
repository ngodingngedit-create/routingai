import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

const LINKS = [
  {
    title: "Model",
    items: [
      { href: "/models", label: "Katalog model" },
      { href: "/docs#harga", label: "Harga per token" },
    ],
  },
  {
    title: "Pemakaian",
    items: [
      { href: "/docs", label: "Panduan mulai" },
      { href: "/dashboard/api-keys", label: "Kunci API" },
      { href: "/dashboard/usage", label: "Riwayat pemakaian" },
    ],
  },
  {
    title: "Legal",
    items: [
      { href: "/terms", label: "Syarat layanan" },
      { href: "/privacy", label: "Kebijakan privasi" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <div className="flex items-center gap-2">
            <BrandMark />
            <span className="text-[15px] font-semibold tracking-tight">RoutingAI</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted">
            Satu kunci API untuk beberapa model AI. Katalog, kunci, dan pemakaian dalam satu panel.
          </p>
        </div>

        {LINKS.map((group) => (
          <div key={group.title}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{group.title}</h2>
            <ul className="mt-3 space-y-2">
              {group.items.map((item) => (
                <li key={item.href + item.label}>
                  <Link href={item.href} className="text-sm text-muted transition-colors hover:text-text">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>RoutingAI. Katalog dan harga mengikuti provider masing-masing.</p>
          <p>Harga model yang belum diatur ditandai sebagai belum tersedia.</p>
        </div>
      </div>
    </footer>
  );
}
