import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatCredits, formatDateTime, formatTokens } from "@/lib/format";
import { buttonClass, Card, CardHeader, EmptyState, PageTitle, StatusBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "Ringkasan" };

export default async function DashboardPage() {
  const { user } = await requireUser();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [keys, todayLogs, recentLogs, pendingOrders] = await Promise.all([
    prisma.apiKey.count({ where: { userId: user.id, status: "ACTIVE" } }),
    prisma.requestLog.aggregate({
      where: { userId: user.id, createdAt: { gte: startOfDay } },
      _sum: { cost: true, promptTokens: true, completionTokens: true },
      _count: { _all: true },
    }),
    prisma.requestLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.order.count({ where: { userId: user.id, status: "PENDING" } }),
  ]);

  return (
    <div className="space-y-8">
      <PageTitle
        title="Ringkasan"
        description="Saldo, pemakaian, dan status kunci API kamu."
      />

      <section className="rounded-[10px] border border-line bg-surface p-5">
        <p className="text-xs text-muted">Saldo tersedia</p>
        <p className="mt-1 font-mono text-3xl text-text">{formatCredits(user.credits)}</p>
        <p className="mt-1 text-sm text-muted">kredit, langsung dipotong mengikuti pemakaian token.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/dashboard/api-keys" className={buttonClass("primary", "sm")}>
            Buat kunci API
          </Link>
          <Link href="/dashboard/billing" className={buttonClass("outline", "sm")}>
            {pendingOrders > 0 ? `${pendingOrders} top up menunggu` : "Ajukan top up"}
          </Link>
        </div>
      </section>

      <div className="flex flex-wrap gap-x-8 gap-y-2 border-y border-line py-4 text-sm">
        <p className="text-muted">
          Dipakai hari ini <span className="font-mono text-text">{formatCredits(todayLogs._sum.cost ?? 0)}</span> kredit
        </p>
        <p className="text-muted">
          Token hari ini{" "}
          <span className="font-mono text-text">
            {formatTokens((todayLogs._sum.promptTokens ?? 0) + (todayLogs._sum.completionTokens ?? 0))}
          </span>
        </p>
        <p className="text-muted">
          Request hari ini <span className="font-mono text-text">{todayLogs._count._all}</span>
        </p>
        <p className="text-muted">
          Kunci aktif <span className="font-mono text-text">{keys}</span>
        </p>
      </div>

      <Card>
        <CardHeader
          title="Permintaan terakhir"
          description="Enam request terakhir dari kunci kamu."
          action={
            <Link href="/dashboard/usage" className="text-xs text-muted hover:text-text">
              Lihat semua
            </Link>
          }
        />
        {recentLogs.length === 0 ? (
          <EmptyState
            title="Belum ada permintaan"
            description="Belum ada request yang lewat dari kunci API kamu. Setelah kunci dipakai, riwayatnya muncul di sini."
            action={
              <Link href="/docs" className={buttonClass("outline", "sm")}>
                Lihat panduan pakai kunci
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-surface-2 text-left text-xs text-muted">
                <tr>
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
                    Waktu
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {recentLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 font-mono text-xs">{log.modelSlug}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {formatTokens(log.promptTokens + log.completionTokens)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{formatCredits(log.cost)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge value={log.status} />
                    </td>
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
