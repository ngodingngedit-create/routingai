import Link from "next/link";
import { redirect } from "next/navigation";
import { googleConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/session";
import { LoginButton } from "@/components/login-button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Masuk",
  description: "Masuk dengan Google untuk memakai kunci API dan melacak pemakaian.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const current = await getCurrentUser();
  if (current) redirect(next && next.startsWith("/") ? next : "/dashboard");

  const callbackURL = next && next.startsWith("/") ? next : "/dashboard";

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-20">
      <h1 className="text-2xl font-semibold tracking-tight text-text">Masuk ke RoutingAI</h1>
      <p className="mt-2 text-sm text-muted">
        Satu akun Google, satu kunci API, saldo sendiri. Tidak ada password yang perlu diingat.
      </p>

      <div className="mt-8 rounded-[10px] border border-line bg-surface p-5">
        <LoginButton
          callbackURL={callbackURL}
          disabled={!googleConfigured}
          reason="Login Google belum dikonfigurasi. Isi GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET di .env lalu restart server."
        />
      </div>

      <p className="mt-4 text-xs text-muted">
        Dengan masuk, kamu setuju dengan{" "}
        <Link href="/terms" className="underline underline-offset-2 hover:text-text">
          syarat layanan
        </Link>{" "}
        dan{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-text">
          kebijakan privasi
        </Link>
        .
      </p>
    </div>
  );
}
