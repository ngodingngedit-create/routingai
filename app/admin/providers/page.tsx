import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { toggleProvider } from "@/lib/actions/admin";
import { buttonClass, Card, CardHeader, PageTitle, StatusBadge } from "@/components/ui";
import { ProviderForm } from "@/components/provider-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Provider" };

export default async function AdminProvidersPage() {
  await requireAdmin();

  const providers = await prisma.provider.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { models: true } } },
  });

  return (
    <div className="space-y-8">
      <PageTitle
        title="Provider"
        description="Kredensial provider dienkripsi sebelum disimpan. Yang tampil di layar ini hanya empat karakter terakhir."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {providers.map((provider) => (
          <Card key={provider.id}>
            <CardHeader
              title={provider.name}
              description={`${provider.kind} · ${provider._count.models} model · ${provider.keyMask || "kredensial belum diisi"}`}
              action={<StatusBadge value={provider.active ? "ACTIVE" : "NONAKTIF"} label={provider.active ? "Aktif" : "Nonaktif"} />}
            />
            <div className="p-4">
              {!provider.active ? (
                <p className="mb-3 rounded-[6px] border border-line bg-surface-2 px-3 py-2 text-xs text-muted">
                  Provider ini belum aktif, jadi modelnya tidak bisa dilayani. Isi kunci API, centang
                  aktif, lalu simpan.
                </p>
              ) : null}
              <ProviderForm
                provider={{
                  id: provider.id,
                  slug: provider.slug,
                  name: provider.name,
                  kind: provider.kind,
                  baseUrl: provider.baseUrl,
                  keyMask: provider.keyMask,
                  active: provider.active,
                }}
                mode="edit"
              />
              <form action={toggleProvider} className="mt-3 border-t border-line pt-3">
                <input type="hidden" name="id" value={provider.id} />
                <button type="submit" className={buttonClass("outline", "sm")}>
                  {provider.active ? "Nonaktifkan provider" : "Aktifkan provider"}
                </button>
              </form>
            </div>
          </Card>
        ))}

        <Card>
          <CardHeader title="Tambah provider" description="Untuk endpoint lain yang mengikuti format OpenAI." />
          <div className="p-4">
            <ProviderForm mode="create" />
          </div>
        </Card>
      </div>
    </div>
  );
}
