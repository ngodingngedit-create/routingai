import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { approveOrder, rejectOrder } from "@/lib/actions/admin";
import { formatCredits, formatDateTime } from "@/lib/format";
import { buttonClass, Card, CardHeader, EmptyState, PageTitle, StatusBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "Top up" };

export default async function AdminOrdersPage() {
  await requireAdmin();

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { email: true } } },
  });

  const pending = orders.filter((order) => order.status === "PENDING");
  const history = orders.filter((order) => order.status !== "PENDING");

  return (
    <div className="space-y-8">
      <PageTitle
        title="Top up"
        description="Setujui untuk menambah kredit, tolak untuk membatalkan. Saldo bertambah saat disetujui."
      />

      <Card>
        <CardHeader title="Menunggu diproses" description={`${pending.length} permintaan`} />
        {pending.length === 0 ? (
          <EmptyState
            title="Tidak ada permintaan menunggu"
            description="Permintaan top up dari pengguna akan muncul di sini."
          />
        ) : (
          <div className="divide-y divide-line">
            {pending.map((order) => (
              <div key={order.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-4">
                <div className="min-w-0">
                  <p className="text-sm text-text">
                    {order.user.email} meminta {formatCredits(order.credits)} kredit
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Nilai ${order.amount.toString()} · {formatDateTime(order.createdAt)}
                  </p>
                  {order.note ? <p className="mt-1 text-xs text-muted">Catatan: {order.note}</p> : null}
                </div>
                <div className="flex gap-2">
                  <form action={approveOrder}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <button type="submit" className={buttonClass("primary", "sm")}>
                      Setujui
                    </button>
                  </form>
                  <form action={rejectOrder}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <button type="submit" className={buttonClass("danger", "sm")}>
                      Tolak
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Riwayat" description="Permintaan yang sudah diproses." />
        {history.length === 0 ? (
          <EmptyState title="Belum ada riwayat" description="Riwayat muncul setelah ada permintaan diproses." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-surface-2 text-left text-xs text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Pengguna
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
                {history.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3 text-xs">{order.user.email}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {formatCredits(order.credits)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        value={order.status}
                        label={order.status === "PAID" ? "Disetujui" : "Ditolak"}
                      />
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted">
                      {formatDateTime(order.createdAt)}
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
