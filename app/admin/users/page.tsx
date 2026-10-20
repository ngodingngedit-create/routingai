import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { setUserRole, setUserStatus } from "@/lib/actions/admin";
import { formatCredits, formatDate } from "@/lib/format";
import { buttonClass, Card, CardHeader, EmptyState, PageTitle, StatusBadge } from "@/components/ui";
import { CreditAdjustForm } from "@/components/credit-adjust-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Pengguna" };

export default async function AdminUsersPage() {
  await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      _count: { select: { apiKeys: true, requestLogs: true } },
    },
  });

  return (
    <div className="space-y-8">
      <PageTitle
        title="Pengguna"
        description="Status akun, peran, dan penyesuaian saldo. Penyesuaian selalu dicatat di riwayat kredit pengguna."
      />

      <Card>
        <CardHeader title="Daftar pengguna" description="100 pengguna terbaru." />
        {users.length === 0 ? (
          <EmptyState title="Belum ada pengguna" description="Pengguna muncul setelah ada yang daftar lewat Google." />
        ) : (
          <div className="divide-y divide-line">
            {users.map((user) => (
              <div key={user.id} className="px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-text">{user.email}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {user.name ?? "-"} · {user._count.apiKeys} kunci · {user._count.requestLogs} request · daftar{" "}
                      {formatDate(user.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-sm text-text">{formatCredits(user.credits)} kredit</span>
                    <StatusBadge
                      value={user.status}
                      label={user.status === "ACTIVE" ? "Aktif" : "Ditangguhkan"}
                    />
                    <span className="text-xs text-muted">{user.role}</span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <form action={setUserStatus}>
                    <input type="hidden" name="userId" value={user.id} />
                    <input
                      type="hidden"
                      name="action"
                      value={user.status === "ACTIVE" ? "suspend" : "activate"}
                    />
                    <button type="submit" className={buttonClass(user.status === "ACTIVE" ? "danger" : "outline", "sm")}>
                      {user.status === "ACTIVE" ? "Tangguhkan" : "Aktifkan"}
                    </button>
                  </form>

                  <form action={setUserRole}>
                    <input type="hidden" name="userId" value={user.id} />
                    <input type="hidden" name="role" value={user.role === "ADMIN" ? "USER" : "ADMIN"} />
                    <button type="submit" className={buttonClass("outline", "sm")}>
                      {user.role === "ADMIN" ? "Jadikan pengguna" : "Jadikan admin"}
                    </button>
                  </form>
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-muted hover:text-text">
                    Penyesuaian kredit
                  </summary>
                  <div className="mt-3">
                    <CreditAdjustForm userId={user.id} email={user.email} />
                  </div>
                </details>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
