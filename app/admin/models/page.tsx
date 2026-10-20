import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { toggleModel } from "@/lib/actions/admin";
import { formatUsdPerMillion } from "@/lib/format";
import { buttonClass, Card, CardHeader, EmptyState, PageTitle, StatusBadge } from "@/components/ui";
import { ModelForm } from "@/components/model-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Model" };

export default async function AdminModelsPage() {
  await requireAdmin();

  const [models, providers] = await Promise.all([
    prisma.model.findMany({
      include: { provider: true },
      orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
    }),
    prisma.provider.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      <PageTitle
        title="Model"
        description="Harga diisi per 1 juta token dalam USD. Model tanpa harga tidak bisa dipakai, jadi katalog tidak pernah menampilkan biaya yang tidak jelas."
      />

      <Card>
        <CardHeader title="Tambah model" description="Model baru langsung masuk katalog kalau diaktifkan." />
        <div className="p-4">
          <ModelForm
            providers={providers.map((provider) => ({
              id: provider.id,
              name: provider.name,
              active: provider.active,
            }))}
            mode="create"
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Model terdaftar" description={`${models.length} model`} />
        {models.length === 0 ? (
          <EmptyState
            title="Belum ada model"
            description="Tambahkan model di atas supaya katalog publik terisi."
          />
        ) : (
          <div className="divide-y divide-line">
            {models.map((model) => (
              <div key={model.id} className="px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm text-text">{model.slug}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {model.displayName} · {model.provider.name} · {model.upstreamModel}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-xs text-muted">
                      {formatUsdPerMillion(model.priceIn)} / {formatUsdPerMillion(model.priceOut)}
                    </span>
                    <StatusBadge
                      value={model.enabled ? "ACTIVE" : "NONAKTIF"}
                      label={model.enabled ? "Aktif" : "Nonaktif"}
                    />
                    <form action={toggleModel}>
                      <input type="hidden" name="id" value={model.id} />
                      <button type="submit" className={buttonClass("outline", "sm")}>
                        {model.enabled ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                    </form>
                  </div>
                </div>

                {model.priceIn.eq(0) && model.priceOut.eq(0) ? (
                  <p className="mt-2 text-xs text-danger">
                    Harga belum diisi, model ini tidak bisa dipakai sampai harga ditetapkan.
                  </p>
                ) : null}

                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-muted hover:text-text">Ubah model</summary>
                  <div className="mt-3">
                    <ModelForm
                      model={{
                        id: model.id,
                        slug: model.slug,
                        displayName: model.displayName,
                        providerId: model.providerId,
                        upstreamModel: model.upstreamModel,
                        priceIn: model.priceIn.toString(),
                        priceOut: model.priceOut.toString(),
                        contextWindow: model.contextWindow,
                        maxOutput: model.maxOutput,
                        enabled: model.enabled,
                        description: model.description,
                      }}
                      providers={providers.map((provider) => ({
                        id: provider.id,
                        name: provider.name,
                        active: provider.active,
                      }))}
                      mode="edit"
                    />
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
