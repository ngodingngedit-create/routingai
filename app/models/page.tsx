import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatUsdPerMillion } from "@/lib/format";
import { buttonClass, EmptyState } from "@/components/ui";
import { ModelTable } from "@/components/model-table";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Katalog model",
  description: "Model yang tersedia beserta provider, konteks, dan harga per juta token.",
};

export default async function ModelsPage() {
  const models = await prisma.model.findMany({
    where: { enabled: true, provider: { active: true } },
    include: { provider: true },
    orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">Katalog model</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Model aktif di RoutingAI. Harga mengikuti provider masing-masing dan dipakai untuk menghitung
            biaya pemakaianmu.
          </p>
        </div>
        <Link href="/docs" className={buttonClass("outline", "sm")}>
          Cara memakai kunci
        </Link>
      </div>

      {models.length > 0 ? (
        <ModelTable
          models={models.map((model) => ({
            slug: model.slug,
            displayName: model.displayName,
            provider: model.provider.name,
            contextWindow: model.contextWindow,
            priceIn: formatUsdPerMillion(model.priceIn),
            priceOut: formatUsdPerMillion(model.priceOut),
          }))}
        />
      ) : (
        <div className="mt-8 rounded-[10px] border border-line bg-surface">
          <EmptyState
            title="Belum ada model yang bisa dilayani"
            description="Model harus aktif, punya harga, dan provider-nya harus aktif dengan kunci API terisi. Katalog terisi sendiri setelah syarat itu terpenuhi."
            action={
              <Link href="/docs" className={buttonClass("outline", "sm")}>
                Lihat cara memakai kunci
              </Link>
            }
          />
        </div>
      )}
    </div>
  );
}
