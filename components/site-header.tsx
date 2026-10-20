import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { BrandMark } from "@/components/brand-mark";
import { getCurrentUser } from "@/lib/session";

export async function SiteHeader() {
  const current = await getCurrentUser();
  const user = current?.user;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-1.5 px-4 sm:gap-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-text">
          <BrandMark />
          <span className="text-[15px] font-semibold tracking-tight">RoutingAI</span>
        </Link>

        <nav className="flex items-center gap-0.5 text-sm sm:gap-1">
          <Link
            href="/models"
            className="rounded-[6px] px-1.5 py-1.5 text-muted transition-colors hover:text-text sm:px-2.5"
          >
            Model
          </Link>
          <Link
            href="/docs"
            className="rounded-[6px] px-1.5 py-1.5 text-muted transition-colors hover:text-text sm:px-2.5"
          >
            Dokumentasi
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <UserMenu
              name={user.name ?? ""}
              email={user.email}
              isAdmin={user.role === "ADMIN"}
            />
          ) : (
            <Link
              href="/login"
              className="rounded-[6px] border border-line px-3 py-1.5 text-sm text-text transition-colors hover:border-line-strong"
            >
              Masuk
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
