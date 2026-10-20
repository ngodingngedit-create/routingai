import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatCredits, formatUsdPerMillion } from "@/lib/format";
import { buttonClass, Code, EmptyState } from "@/components/ui";
import { CopyButton } from "@/components/copy-button";

export const dynamic = "force-dynamic";

const FAQ = [
  {
    question: "Bagaimana saya mendapat kredit untuk mulai memakai?",
    answer:
      "Saat pertama kali daftar dengan Google, akun dapat kredit awal dari admin. Saldo itu dipotong otomatis mengikuti pemakaian token. Kalau kurang, isi ulang lewat panel saya atau minta top-up ke admin.",
  },
  {
    question: "Bagaimana kunci API saya disimpan?",
    answer:
      "Kunci asli hanya ditampilkan satu kali saat dibuat. Yang tersimpan di database adalah hash SHA-256, jadi kunci tidak bisa dibaca ulang oleh siapa pun, termasuk admin.",
  },
  {
    question: "Model apa saja yang tersedia dan berapa harganya?",
    answer:
      "Katalog menampilkan model yang aktif beserta provider, konteks, dan harga per juta token. Model yang harganya belum diatur tidak bisa dipakai, jadi tidak ada permintaan yang berjalan tanpa biaya yang jelas.",
  },
  {
    question: "Bisa pakai SDK OpenAI atau kode saya yang sekarang?",
    answer:
      "Bisa. Arahkan base_url ke https://domain-anda/v1 dan pakai kunci RoutingAI sebagai api_key. Format request dan respons mengikuti OpenAI Chat Completions, termasuk mode streaming.",
  },
  {
    question: "Kenapa harus login dengan Google?",
    answer:
      "Akun Google sudah terverifikasi emailnya, jadi tidak ada pendaftaran dengan email palsu atau akun sekali pakai. Rate limit juga diterapkan di endpoint login.",
  },
  {
    question: "Bagaimana biaya dihitung?",
    answer:
      "Biaya dihitung dari token input dan token output yang dilaporkan provider, dikali harga model di katalog. Admin bisa menambah margin di atas harga provider. Semua potongan tercatat di riwayat pemakaian.",
  },
];

export default async function HomePage() {
  const [models, providers, settings] = await Promise.all([
    prisma.model.findMany({
      where: { enabled: true, provider: { active: true } },
      include: { provider: true },
      orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
      take: 8,
    }),
    prisma.provider.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    getSettings(),
  ]);

  const curl = `curl https://domain-anda/v1/chat/completions \\
  -H "Authorization: Bearer sk-rly-..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${models[0]?.slug ?? "gpt-4o-mini"}",
    "messages": [{"role": "user", "content": "Halo"}]
  }'`;

  const sdk = `from openai import OpenAI

client = OpenAI(
    base_url="https://domain-anda/v1",
    api_key="sk-rly-...",
)

reply = client.chat.completions.create(
    model="${models[0]?.slug ?? "gpt-4o-mini"}",
    messages=[{"role": "user", "content": "Halo"}],
)
print(reply.choices[0].message.content)`;

  const markup = Number(settings.markupPercent);

  return (
    <div className="mx-auto w-full max-w-6xl px-4">
      <section className="grid grid-cols-1 gap-10 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-20">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-text sm:text-4xl">
            Satu kunci API untuk beberapa model AI.
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted">
            RoutingAI meneruskan permintaan ke provider yang kamu pilih, menghitung biaya dari token
            yang benar-benar terpakai, dan mencatat semuanya di satu panel.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/login" className={buttonClass("primary", "md")}>
              Masuk dengan Google
            </Link>
            <Link href="/models" className={buttonClass("outline", "md")}>
              Lihat katalog model
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted">
            Kredit awal {formatCredits(settings.signupCredits)} kredit untuk setiap akun baru.
          </p>
        </div>

        <div className="min-w-0 rounded-[10px] border border-line bg-surface p-5">
          <p className="text-xs font-medium text-muted">Alur permintaan</p>
          <ol className="mt-4 space-y-0">
            <li className="border-l-2 border-line-strong pb-4 pl-4">
              <p className="font-mono text-sm text-text">sk-rly-...</p>
              <p className="text-xs text-muted">Kunci API milikmu</p>
            </li>
            <li className="border-l-2 border-accent pb-4 pl-4">
              <p className="text-sm text-text">RoutingAI</p>
              <p className="text-xs text-muted">Cek saldo, limit, dan harga model</p>
            </li>
            <li className="border-l-2 border-line-strong pl-4">
              <p className="text-sm text-text">
                {providers.length > 0
                  ? providers.map((provider) => provider.name).join(", ")
                  : "Belum ada provider aktif"}
              </p>
              <p className="text-xs text-muted">
                {providers.length > 0
                  ? "Provider yang dikonfigurasi admin"
                  : "Admin belum mengaktifkan provider"}
              </p>
            </li>
          </ol>
        </div>
      </section>

      <section className="border-t border-line py-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-text">Model yang tersedia</h2>
            <p className="mt-1 text-sm text-muted">
              {models.length > 0
                ? `${models.length} model aktif. Harga per juta token, sesuai provider masing-masing.`
                : "Katalog sedang diisi admin."}
            </p>
          </div>
          <Link href="/models" className={buttonClass("outline", "sm")}>
            Katalog lengkap
          </Link>
        </div>

        {models.length > 0 ? (
          <div className="mt-6 overflow-hidden rounded-[10px] border border-line">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-left text-xs text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Model
                  </th>
                  <th scope="col" className="hidden px-4 py-2.5 font-medium sm:table-cell">
                    Provider
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    Input / 1M
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    Output / 1M
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface">
                {models.map((model) => (
                  <tr key={model.id}>
                    <td className="px-4 py-3">
                      <Link href={`/models/${model.slug}`} className="font-mono text-sm text-text hover:text-accent">
                        {model.slug}
                      </Link>
                      <p className="text-xs text-muted">{model.displayName}</p>
                    </td>
                    <td className="hidden px-4 py-3 text-muted sm:table-cell">{model.provider.name}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {formatUsdPerMillion(model.priceIn)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {formatUsdPerMillion(model.priceOut)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-6 rounded-[10px] border border-line bg-surface">
            <EmptyState
              title="Belum ada model aktif"
              description="Admin belum mengaktifkan model dengan harga yang sudah diverifikasi. Katalog akan terisi sendiri begitu model pertama aktif."
              action={
                <Link href="/models" className={buttonClass("outline", "sm")}>
                  Buka halaman katalog
                </Link>
              }
            />
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-10 border-t border-line py-12 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-text">Mulai dalam dua langkah</h2>
          <ol className="mt-5 space-y-5">
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-accent-soft font-mono text-xs text-accent">
                1
              </span>
              <div>
                <p className="text-sm font-medium text-text">Masuk dengan Google</p>
                <p className="mt-0.5 text-sm text-muted">
                  Akun dibuat otomatis dan langsung dapat kredit awal {formatCredits(settings.signupCredits)} kredit.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-accent-soft font-mono text-xs text-accent">
                2
              </span>
              <div>
                <p className="text-sm font-medium text-text">Buat kunci API</p>
                <p className="mt-0.5 text-sm text-muted">
                  Kunci ditampilkan sekali. Simpan di tempat aman, tidak bisa dilihat ulang.
                </p>
              </div>
            </li>
          </ol>
          <Link href="/docs" className={buttonClass("outline", "md")}>
            Panduan lengkap
          </Link>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="overflow-hidden rounded-[10px] border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-3 py-2">
              <span className="font-mono text-xs text-muted">curl</span>
              <CopyButton value={curl} />
            </div>
            <pre className="overflow-x-auto px-4 py-3 font-mono text-[12.5px] leading-relaxed text-text">
              {curl}
            </pre>
          </div>
          <div className="overflow-hidden rounded-[10px] border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-3 py-2">
              <span className="font-mono text-xs text-muted">openai python</span>
              <CopyButton value={sdk} />
            </div>
            <pre className="overflow-x-auto px-4 py-3 font-mono text-[12.5px] leading-relaxed text-text">
              {sdk}
            </pre>
          </div>
        </div>
      </section>

      <section className="border-t border-line py-12">
        <h2 className="text-xl font-semibold tracking-tight text-text">Bagaimana biayanya</h2>
        <div className="mt-6 grid gap-8 sm:grid-cols-3">
          <div>
            <p className="text-sm font-medium text-text">Harga per token</p>
            <p className="mt-1 text-sm text-muted">
              Tiap model punya harga input dan output per juta token, mengikuti harga provider.
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-text">Saldo dalam kredit</p>
            <p className="mt-1 text-sm text-muted">
              {formatCredits(settings.creditsPerUsd)} kredit setara 1 USD. Saldo dipotong sesuai pemakaian nyata.
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-text">Margin admin</p>
            <p className="mt-1 text-sm text-muted">
              {markup > 0 ? `Ada margin ${markup}% di atas harga provider.` : "Belum ada margin tambahan."}
            </p>
          </div>
        </div>
        <p className="mt-6 text-sm text-muted">
          Semua model bisa dipakai selama saldo mencukupi. Kebutuhan kredit maksimum dihitung dari
          <Code>max_tokens</Code> yang kamu kirim, jadi tidak ada permintaan yang berjalan tanpa biaya
          yang jelas.
        </p>
      </section>

      <section className="border-t border-line py-12">
        <h2 className="text-xl font-semibold tracking-tight text-text">Pertanyaan yang sering muncul</h2>
        <div className="mt-5 divide-y divide-line border-y border-line">
          {FAQ.map((item) => (
            <details key={item.question} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-text">
                {item.question}
                <span className="text-muted transition-transform group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="mt-2 max-w-2xl text-sm text-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
