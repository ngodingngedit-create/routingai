import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { daysAgo } from "@/lib/dates";
import { formatCredits, formatDateTime, formatTokens } from "@/lib/format";
import { Card, CardHeader, EmptyState, PageTitle, StatusBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "Pemakaian" };

export default async function UsagePage() {
  const { user } = await requireUser();

  const since = daysAgo(30);

  const [grouped, logs] = await Promise.all([
    prisma.requestLog.groupBy({
      by: ["modelSlug"],
      where: { userId: user.id, createdAt: { gte: since } },
      _sum: { promptTokens: true, completionTokens: true, cost: true },
      _count: { _all: true },
    }),
    prisma.requestLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const totalCredits = grouped.reduce((sum, row) => sum + Number(row._sum.cost ?? 0), 0);
  const totalTokens = grouped.reduce(
    (sum, row) => sum + (row._sum.promptTokens ?? 0) + (row._sum.completionTokens ?? 0),
    0,
  );

  return (
    <div className="space-y-8">
      <PageTitle
        title="Pemakaian"
        description="Rincian 30 hari terakhir dan daftar request terbaru dari kunci kamu."
      />

      <Card>
        <CardHeader
          title="Ringkasan per model"
          description={`${formatCredits(totalCredits)} kredit terpakai, ${formatTokens(totalTokens)} token.`}
        />
        {grouped.length === 0 ? (
          <EmptyState
            title="Belum ada pemakaian"
            description="Rincian muncul setelah kunci API dipakai untuk memanggil model."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-surface-2 text-left text-xs text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Model
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    Request
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    Token input
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    Token output
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    Kredit
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {grouped.map((row) => (
                  <tr key={row.modelSlug}>
                    <td className="px-4 py-3 font-mono text-xs">{row.modelSlug}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{row._count._all}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {formatTokens(row._sum.promptTokens ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {formatTokens(row._sum.completionTokens ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {formatCredits(row._sum.cost ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Request terbaru" description="100 request terakhir." />
        {logs.length === 0 ? (
          <EmptyState
            title="Belum ada request"
            description="Setiap request yang lewat dari kunci API akan tercatat di sini, termasuk yang gagal."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-surface-2 text-left text-xs text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Model
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Provider
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    Token
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    Kredit
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-medium">
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
                    <td className="px-4 py-3 font-mono text-xs">{log.modelSlug}</td>
                    <td className="px-4 py-3 text-xs text-muted">{log.providerSlug}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {formatTokens(log.promptTokens + log.completionTokens)}
                      {log.estimated ? (
                        <span className="ml-1 text-[10px] text-muted" title="Estimasi, provider tidak melaporkan usage">
                          est
                        </span>
                      ) : null}
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
