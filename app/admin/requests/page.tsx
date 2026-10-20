import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { formatCredits, formatDateTime, formatTokens } from "@/lib/format";
import { Card, CardHeader, EmptyState, PageTitle, StatusBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "Request" };

export default async function AdminRequestsPage() {
  await requireAdmin();

  const logs = await prisma.requestLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { email: true } } },
  });

  return (
    <div className="space-y-8">
      <PageTitle
        title="Request"
        description="100 request terakhir dari semua pengguna. Isi prompt dan respons tidak disimpan."
      />

      <Card>
        <CardHeader title="Log request" description="Token, biaya, dan status per request." />
        {logs.length === 0 ? (
          <EmptyState
            title="Belum ada request"
            description="Log terisi setelah pengguna memanggil model lewat kunci API."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-surface-2 text-left text-xs text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Pengguna
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Model
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    Token
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    Kredit
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    Durasi
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    Waktu
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 text-xs">{log.user.email}</td>
                    <td className="px-4 py-3 font-mono text-xs">{log.modelSlug}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {formatTokens(log.promptTokens + log.completionTokens)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{formatCredits(log.cost)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge value={log.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{log.latencyMs} ms</td>
                    <td className="px-4 py-3 text-right text-xs text-muted">
                      {formatDateTime(log.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
