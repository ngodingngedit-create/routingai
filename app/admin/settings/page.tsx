import { requireAdmin } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { Card, CardHeader, PageTitle } from "@/components/ui";
import { SettingsForm } from "@/components/settings-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Pengaturan" };

function marginExample(markupPercent: string): string {
  const base = 0.0125;
  const markup = Number(markupPercent) || 0;
  const effective = base * (1 + markup / 100);
  return `harga provider $${base} -> dibayar $${effective.toFixed(5)} per 1M token (margin ${markup}%)`;
}

export default async function AdminSettingsPage() {
  await requireAdmin();
  const settings = await getSettings();

  return (
    <div className="space-y-8">
      <PageTitle
        title="Pengaturan"
        description="Nilai di sini dipakai untuk request berikutnya, tanpa perlu restart server."
      />

      <Card>
        <CardHeader
          title="Saldo, harga, dan akses"
          description="Perubahan berlaku segera setelah disimpan."
        />
        <div className="p-4">
          <SettingsForm settings={settings} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Efek margin" description="Harga di katalog selalu harga yang dibayar pemanggil." />
        <div className="space-y-2 p-4 text-sm text-muted">
          <p>
            Harga di form model adalah harga provider. Margin di atas menambah harga yang dilihat dan
            dibayar pemanggil.
          </p>
          <p className="font-mono text-xs text-text">
            {marginExample(settings.markupPercent)}
          </p>
          <p>
            Margin sekarang {settings.markupPercent}%. Biaya per request =
            (token input x harga + token output x harga) x (1 + margin) x {settings.creditsPerUsd} kredit
            per USD.
          </p>
        </div>
      </Card>
    </div>
  );
}
