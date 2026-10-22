import Link from "next/link";
import { prisma } from "@/lib/db";
import { getApiBaseUrl } from "@/lib/public-url";
import { getSettings } from "@/lib/settings";
import { formatCredits } from "@/lib/format";
import { Code } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dokumentasi",
  description: "Cara memakai kunci RoutingAI, endpoint yang tersedia, kode error, dan cara hitung biaya.",
};

export default async function DocsPage() {
  const [settings, modelCount, providerCount, baseUrl] = await Promise.all([
    getSettings(),
    prisma.model.count({ where: { enabled: true } }),
    prisma.provider.count({ where: { active: true } }),
    getApiBaseUrl(),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-text">Dokumentasi</h1>
      <p className="mt-2 text-sm text-muted">
        RoutingAI memakai format OpenAI Chat Completions, jadi sebagian besar SDK bisa dipakai tanpa
        perubahan besar.
      </p>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-text">1. Ambil kunci</h2>
        <p className="mt-2 text-sm text-muted">
          Masuk dengan Google, lalu buka{" "}
          <Link href="/dashboard/api-keys" className="underline underline-offset-2 hover:text-text">
            panel kunci API
          </Link>
          . Kunci ditampilkan sekali, jadi langsung simpan di penyimpan rahasia atau environment variable
          aplikasi.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-text">2. Arahkan SDK ke RoutingAI</h2>
        <pre className="mt-3 overflow-x-auto rounded-[10px] border border-line bg-surface px-4 py-3 font-mono text-[12.5px] leading-relaxed text-text">
{`from openai import OpenAI

client = OpenAI(
    base_url="${baseUrl}",
    api_key="sk-rly-...",
)

reply = client.chat.completions.create(
    model="MODEL_SLUG",
    messages=[{"role": "user", "content": "Halo"}],
)
print(reply.choices[0].message.content)`}
        </pre>
        <p className="mt-3 text-sm text-muted">
          Ganti <Code>MODEL_SLUG</Code> dengan salah satu slug dari{" "}
          <Link href="/models" className="underline underline-offset-2 hover:text-text">
            katalog model
          </Link>
          . Paket <Code>node</Code>, <Code>curl</Code>, dan <Code>axios</Code> mengikuti pola yang sama.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-text">3. Endpoint yang tersedia</h2>
        <div className="mt-3 overflow-hidden rounded-[10px] border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs text-muted">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Endpoint
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Keterangan
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              <tr>
                <td className="px-4 py-3 font-mono text-xs">POST /v1/chat/completions</td>
                <td className="px-4 py-3 text-muted">Chat completion, streaming dan non streaming</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono text-xs">GET /v1/models</td>
                <td className="px-4 py-3 text-muted">Daftar model aktif beserta harga</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono text-xs">GET /v1/usage</td>
                <td className="px-4 py-3 text-muted">Ringkasan pemakaian untuk kunci yang dipakai</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10" id="harga">
        <h2 className="text-lg font-semibold text-text">Cara hitung biaya</h2>
        <p className="mt-2 text-sm text-muted">
          Biaya memakai token input dan output yang dilaporkan provider, dikali harga model di katalog.
          {Number(settings.markupPercent) > 0
            ? ` Admin menambahkan margin ${settings.markupPercent}% di atas harga provider.`
            : " Saat ini belum ada margin tambahan di atas harga provider."}{" "}
          {formatCredits(settings.creditsPerUsd)} kredit setara 1 USD, dan saldo dipotong otomatis setiap
          permintaan.
        </p>
        <p className="mt-2 text-sm text-muted">
          Biaya diperiksa sebelum permintaan dikirim. Saldo yang kurang ditolak dengan kode{" "}
          <Code>402 insufficient_credits</Code>, jadi tidak ada permintaan yang berjalan tanpa biaya yang
          jelas.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-text">Kode error yang sering muncul</h2>
        <div className="mt-3 divide-y divide-line border-y border-line">
          {[
            ["401 invalid_api_key", "Kunci tidak dikenal. Cek header Authorization dan kunci yang dipakai."],
            ["402 insufficient_credits", "Saldo tidak cukup. Turunkan max_tokens atau isi saldo."],
            ["404 model_not_found", "Slug model tidak ada atau sedang dinonaktifkan."],
            [
              "429 rate_limited",
              "Batas permintaan per menit untuk kunci ini terlampaui. Tunggu satu menit.",
            ],
            ["503 provider_not_configured", "Admin belum mengisi kredensial provider untuk model ini."],
            ["503 model_price_missing", "Harga model belum diatur, model tidak bisa dipakai."],
          ].map(([code, meaning]) => (
            <div key={code} className="py-3">
              <p className="font-mono text-xs text-text">{code}</p>
              <p className="mt-1 text-sm text-muted">{meaning}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-text">Status saat ini</h2>
        <p className="mt-2 text-sm text-muted">
          {modelCount} model aktif dan {providerCount} provider aktif. Data diambil langsung dari
          katalog, bukan angka marketing.
        </p>
      </section>
    </div>
  );
}
