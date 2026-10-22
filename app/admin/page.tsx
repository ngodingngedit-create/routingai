import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { formatCredits, formatDateTime } from "@/lib/format";
import { buttonClass, Card, CardHeader, EmptyState, PageTitle, StatusBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  await requireAdmin();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [users, activeModels, activeProviders, todayLogs, pendingOrders, recentErrors] = await Promise.all([
    prisma.user.count(),
    prisma.model.count({ where: { enabled: true } }),
    prisma.provider.count({ where: { active: true } }),
    prisma.requestLog.aggregate({
      where: { createdAt: { gte: startOfDay } },
      _sum: { cost: true },
      _count: { _all: true },
    }),
    prisma.order.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { email: true } } },
      take: 10,
    }),
    prisma.requestLog.findMany({
      where: { status: { not: "OK" } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const pendingCount = await prisma.order.count({ where: { status: "PENDING" } });
  const needsAction = pendingOrders.length + recentErrors.length;

  const [providersWithoutKey, inactiveProviders, disabledModels, modelsWithoutPrice, hiddenModels] =
    await Promise.all([
      prisma.provider.count({ where: { keyMask: "" } }),
      prisma.provider.count({ where: { active: false } }),
      prisma.model.count({ where: { enabled: false } }),
      prisma.model.count({ where: { priceIn: 0, priceOut: 0 } }),
      prisma.model.count({ where: { enabled: true, provider: { active: false } } }),
    ]);

  const checklist = [
    {
      count: providersWithoutKey,
      label: "provider belum punya kunci API",
      href: "/admin/providers",
    },
    {
      count: inactiveProviders,
      label: "provider nonaktif",
      href: "/admin/providers",
    },
    {
      count: hiddenModels,
      label: "model aktif tapi provider-nya nonaktif, jadi tidak tampil di katalog",
      href: "/admin/models",
    },
    {
      count: disabledModels,
      label: "model belum diaktifkan",
      href: "/admin/models",
    },
    {
      count: modelsWithoutPrice,
      label: "model belum punya harga",
      href: "/admin/models",
    },
  ].filter((item) => item.count > 0);

  return (
    <div className="space-y-8">
      <PageTitle
        title="Ringkasan admin"
        description="Semua angka di bawah dihitung dari data yang sedang berjalan, tidak ada angka marketing."
      />

      <Card>
        <CardHeader
          title="Perlu tindakan"
          description={
            needsAction > 0
              ? `${pendingOrders.length} top up menunggu, ${recentErrors.length} request bermasalah.`
              : "Tidak ada yang menunggu keputusan admin saat ini."
          }
        />
        {needsAction === 0 ? (
          <EmptyState
            title="Semua beres"
            description="Tidak ada top up yang menunggu dan tidak ada request yang gagal. Kalau ada, keputusannya muncul di sini."
            action={
              <Link href="/admin/requests" className={buttonClass("outline", "sm")}>
                Lihat log request
              </Link>
            }
          />
        ) : (
          <div className="divide-y divide-line">
            {pendingOrders.map((order) => (
              <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-text">
                    {order.user.email} meminta {formatCredits(order.credits)} kredit
                  </p>
                  <p className="mt-0.5 text-xs text-muted">{formatDateTime(order.createdAt)}</p>
                </div>
                <Link href="/admin/orders" className={buttonClass("primary", "sm")}>
                  Proses top up
                </Link>
              </div>
            ))}
            {recentErrors.map((log) => (
              <div key={log.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-text">
                    <span className="font-mono text-xs">{log.modelSlug}</span> gagal diproses
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {log.errorMessage ?? "-"} · {formatDateTime(log.createdAt)}
                  </p>
                </div>
                <StatusBadge value={log.status} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Checklist"
          description="Syarat supaya model bisa dipakai dan tampil di katalog."
        />
        {checklist.length === 0 ? (
          <EmptyState
            title="Semua sudah siap"
            description="Setiap provider punya kunci API dan aktif, semua model punya harga dan aktif. Katalog publik siap dipakai."
          />
        ) : (
          <div className="divide-y divide-line">
            {checklist.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
              >
                <span className="text-sm text-muted">{item.label}</span>
                <span className="font-mono text-sm text-text">{item.count}</span>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <div className="flex flex-wrap gap-x-8 gap-y-2 border-y border-line py-4 text-sm">
        <p className="text-muted">
          Pengguna <span className="font-mono text-text">{users}</span>
        </p>
        <p className="text-muted">
          Model aktif <span className="font-mono text-text">{activeModels}</span>
        </p>
        <p className="text-muted">
          Provider aktif <span className="font-mono text-text">{activeProviders}</span>
        </p>
        <p className="text-muted">
          Request hari ini <span className="font-mono text-text">{todayLogs._count._all}</span>
        </p>
        <p className="text-muted">
          Kredit terpakai hari ini{" "}
          <span className="font-mono text-text">{formatCredits(todayLogs._sum.cost ?? 0)}</span>
        </p>
        <p className="text-muted">
          Top up menunggu <span className="font-mono text-text">{pendingCount}</span>
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/admin/models" className={buttonClass("outline", "md")}>
          Kelola model dan harga
        </Link>
        <Link href="/admin/providers" className={buttonClass("outline", "md")}>
          Kelola provider
        </Link>
        <Link href="/admin/orders" className={buttonClass("outline", "md")}>
          Proses top up
        </Link>
        <Link href="/admin/users" className={buttonClass("outline", "md")}>
          Kelola pengguna
        </Link>
      </div>
    </div>
  );
}
