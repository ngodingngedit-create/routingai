import { requireAdmin } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { Card, CardHeader, PageTitle } from "@/components/ui";
import { SettingsForm } from "@/components/settings-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Pengaturan" };

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
    </div>
  );
}
