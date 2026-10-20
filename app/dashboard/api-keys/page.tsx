import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { revokeApiKey } from "@/lib/actions/keys";
import { formatDateTime } from "@/lib/format";
import { buttonClass, Card, CardHeader, EmptyState, PageTitle, StatusBadge } from "@/components/ui";
import { ApiKeyForm } from "@/components/api-key-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Kunci API" };

export default async function ApiKeysPage() {
  const { user } = await requireUser();
  const keys = await prisma.apiKey.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <PageTitle
        title="Kunci API"
        description="Kunci ini yang dipakai saat memanggil endpoint RoutingAI. Nilai asli hanya ditampilkan sekali."
      />

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
