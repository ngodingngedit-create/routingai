import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { revokeApiKey } from "@/lib/actions/keys";
import { formatDateTime } from "@/lib/format";
import { getApiBaseUrl } from "@/lib/public-url";
import { buttonClass, Card, CardHeader, Code, EmptyState, PageTitle, StatusBadge } from "@/components/ui";
import { ApiKeyForm } from "@/components/api-key-form";
import { CopyButton } from "@/components/copy-button";

export const dynamic = "force-dynamic";

export const metadata = { title: "Kunci API" };

export default async function ApiKeysPage() {
  const { user } = await requireUser();
  const [keys, baseUrl] = await Promise.all([
    prisma.apiKey.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    getApiBaseUrl(),
  ]);

  const snippet = `from openai import OpenAI

client = OpenAI(
    base_url="${baseUrl}",
    api_key="sk-rly-...",
)`;

  return (
    <div className="space-y-8">
      <PageTitle
        title="Kunci API"
        description="Kunci ini yang dipakai saat memanggil endpoint RoutingAI. Nilai asli hanya ditampilkan sekali."
      />

      <Card>
        <CardHeader
          title="Base URL"
          description="Masukkan ke base_url SDK, atau ke header Authorization kalau memakai curl."
        />
        <div className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-[6px] border border-line bg-surface-2 px-3 py-2 font-mono text-sm text-text">
              {baseUrl}
            </code>
            <CopyButton value={baseUrl} />
          </div>
          <pre className="overflow-x-auto rounded-[6px] border border-line bg-surface-2 px-3 py-2 font-mono text-[12.5px] leading-relaxed text-muted">
            {snippet}
          </pre>
          <p className="text-xs text-muted">
            Endpoint yang tersedia: <Code>/v1/chat/completions</Code>, <Code>/v1/models</Code>,{" "}
            <Code>/v1/usage</Code>. Detailnya ada di{" "}
            <Link href="/docs" className="underline underline-offset-2 hover:text-text">
              dokumentasi
            </Link>
            .
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Buat kunci baru" description="Maksimal 10 kunci aktif per akun." />
        <div className="p-4">
          <ApiKeyForm />
        </div>
      </Card>

      <Card>
        <CardHeader title="Kunci kamu" description="Cabut kunci yang sudah tidak dipakai atau bocor." />
        {keys.length === 0 ? (
          <EmptyState
            title="Belum ada kunci"
            description="Buat kunci pertama di atas. Kunci dipakai sebagai api_key pada SDK OpenAI atau Authorization header."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-surface-2 text-left text-xs text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Nama
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Kunci
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    Limit/menit
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    Terakhir dipakai
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {keys.map((key) => (
                  <tr key={key.id}>
                    <td className="px-4 py-3">{key.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      {key.prefix}...{key.last4}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        value={key.status}
                        label={key.status === "ACTIVE" ? "Aktif" : "Dicabut"}
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{key.rpmLimit}</td>
                    <td className="px-4 py-3 text-right text-xs text-muted">
                      {key.lastUsedAt ? formatDateTime(key.lastUsedAt) : "Belum pernah"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {key.status === "ACTIVE" ? (
                        <form action={revokeApiKey}>
                          <input type="hidden" name="id" value={key.id} />
                          <button type="submit" className={buttonClass("danger", "sm")}>
                            Cabut
                          </button>
                        </form>
                      ) : (
                        <span className="text-xs text-muted">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-xs text-muted">
        Kunci dicabut tidak bisa diaktifkan lagi. Kalau bocor, cabut lalu buat yang baru. Butuh contoh
        pemanggilan? Lihat{" "}
        <Link href="/docs" className="underline underline-offset-2 hover:text-text">
          dokumentasi
        </Link>
        .
      </p>
    </div>
  );
}
