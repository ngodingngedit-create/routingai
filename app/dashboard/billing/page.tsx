import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { formatCredits, formatDateTime } from "@/lib/format";
import { Card, CardHeader, EmptyState, PageTitle, StatusBadge } from "@/components/ui";
import { TopUpForm } from "@/components/topup-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Saldo" };

export default async function BillingPage() {
  const { user } = await requireUser();

  const [settings, transactions, orders] = await Promise.all([
    getSettings(),
    prisma.creditTx.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const pendingOrders = orders.filter((order) => order.status === "PENDING");

  return (
    <div className="space-y-8">
      <PageTitle
        title="Saldo dan tagihan"
        description="Saldo dipotong otomatis mengikuti pemakaian. Top up diproses manual oleh admin."
      />

      <section className="rounded-[10px] border border-line bg-surface p-5">
        <p className="text-xs text-muted">Saldo sekarang</p>
        <p className="mt-1 font-mono text-3xl text-text">{formatCredits(user.credits)}</p>
        <p className="mt-1 text-sm text-muted">
          kredit, setara ${(Number(user.credits) / (Number(settings.creditsPerUsd) || 1000)).toFixed(3)} dengan{" "}
          {settings.creditsPerUsd} kredit per 1 USD.
        </p>
      </section>

      <div className="flex flex-wrap gap-x-8 gap-y-2 border-y border-line py-4 text-sm">
        <p className="text-muted">
          Top up menunggu <span className="font-mono text-text">{pendingOrders.length}</span>
        </p>
        <p className="text-muted">
          Total permintaan <span className="font-mono text-text">{orders.length}</span>
        </p>
        <p className="text-muted">
          Mutasi tercatat <span className="font-mono text-text">{transactions.length}</span>
        </p>
      </div>

      <Card>
        <CardHeader
          title="Ajukan top up"
          description="Isi jumlah kredit yang kamu butuhkan. Saldo bertambah setelah admin menyetujui."
        />
        <div className="p-4">
          <TopUpForm />
        </div>
      </Card>

      {orders.length > 0 ? (
        <Card>
          <CardHeader title="Permintaan top up" description="Riwayat pengajuan yang kamu kirim." />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-surface-2 text-left text-xs text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Kredit
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    Nilai
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
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3 font-mono text-xs">{formatCredits(order.credits)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">${order.amount.toString()}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        value={order.status}
                        label={
                          order.status === "PENDING"
                            ? "Menunggu"
                            : order.status === "PAID"
                              ? "Disetujui"
                              : "Ditolak"
                        }
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
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Riwayat kredit" description="Setiap perubahan saldo tercatat lengkap." />
        {transactions.length === 0 ? (
          <EmptyState
            title="Belum ada mutasi"
            description="Saldo awal dan setiap pemakaian token akan tercatat di sini."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-surface-2 text-left text-xs text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Jenis
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    Jumlah
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    Saldo
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Keterangan
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    Waktu
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="px-4 py-3 text-xs">
                      {tx.type === "TOPUP"
                        ? "Top up"
                        : tx.type === "USAGE"
                          ? "Pemakaian"
                          : tx.type === "REFUND"
                            ? "Pengembalian"
                            : "Penyesuaian"}
                    </td>
                    <td
                      className={
                        Number(tx.amount) < 0 ? "px-4 py-3 text-right font-mono text-xs text-danger" : "px-4 py-3 text-right font-mono text-xs text-ok"
                      }
                    >
                      {Number(tx.amount) < 0 ? "" : "+"}
                      {formatCredits(tx.amount)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {formatCredits(tx.balanceAfter)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">{tx.note ?? "-"}</td>
                    <td className="px-4 py-3 text-right text-xs text-muted">
                      {formatDateTime(tx.createdAt)}
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
