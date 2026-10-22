import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatEffectivePrice } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { Card, CardHeader, EmptyState, PageTitle } from "@/components/ui";
import { PlaygroundForm } from "@/components/playground-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Playground" };

export default async function PlaygroundPage() {
  await requireUser();

  const [models, settings] = await Promise.all([
    prisma.model.findMany({
      where: { enabled: true, provider: { active: true } },
      include: { provider: true },
      orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
    }),
    getSettings(),
  ]);

  return (
    <div className="space-y-6">
      <PageTitle
        title="Playground"
        description="Kirim request nyata ke model aktif memakai kunci API milikmu. Request ini memakai kredit seperti panggilan API biasa dan tercatat di riwayat pemakaian."
      />

      {models.length === 0 ? (
        <Card>
          <CardHeader title="Belum ada model yang bisa dipanggil" />
          <EmptyState
            title="Katalog masih kosong"
            description="Playground butuh minimal satu model aktif. Admin perlu mengaktifkan provider dan model di panel admin."
          />
        </Card>
      ) : (
        <PlaygroundForm
          models={models.map((model) => ({
            slug: model.slug,
            displayName: model.displayName,
            provider: model.provider.name,
            priceIn: formatEffectivePrice(model.priceIn, settings.markupPercent),
            priceOut: formatEffectivePrice(model.priceOut, settings.markupPercent),
            contextWindow: model.contextWindow,
          }))}
        />
      )}
    </div>
  );
}
