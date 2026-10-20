import Link from "next/link";

export const metadata = {
  title: "Syarat layanan",
  description: "Syarat penggunaan layanan RoutingAI.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-text">Syarat layanan</h1>
      <p className="mt-2 text-sm text-muted">Versi sederhana, berlaku untuk penggunaan layanan ini.</p>

      <div className="mt-8 space-y-6 text-sm text-muted">
        <section>
          <h2 className="text-base font-semibold text-text">Akun dan akses</h2>
          <p className="mt-1.5">
            Akun dibuat lewat login Google. Satu akun hanya boleh dipakai satu orang. Kunci API bersifat
            pribadi dan tidak boleh dibagikan. Akun yang disuspensi berhenti bisa memakai kunci.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text">Saldo dan penggunaan</h2>
          <p className="mt-1.5">
            Setiap akun punya saldo sendiri dalam satuan kredit. Kredit hanya terpakai untuk permintaan
            yang berhasil dikirim ke provider. Saldo tidak dikembalikan secara otomatis jika provider
            menolak permintaan, dan biaya tetap tercatat di riwayat pemakaian.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text">Pemakaian yang dilarang</h2>
          <p className="mt-1.5">
            Dilarang memakai layanan ini untuk melanggar hukum, menyalahgunakan layanan pihak ketiga, atau
            generate konten yang melanggar hak orang lain. Admin dapat menonaktifkan akun yang melanggar
            aturan ini.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text">Ketersediaan model</h2>
          <p className="mt-1.5">
            Katalog model berubah mengikuti provider. Model bisa dinonaktifkan kapan saja, dan harga
            mengikuti harga provider yang berlaku saat permintaan diproses. Harga di katalog selalu
            ditampilkan lengkap, termasuk status model yang harganya belum diatur.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text">Perubahan syarat</h2>
          <p className="mt-1.5">
            Syarat ini bisa diperbarui. Perubahan besar diumumkan lewat halaman ini dan email ke akun
            yang terdaftar.
          </p>
        </section>
      </div>

      <p className="mt-10 text-sm text-muted">
        Ada pertanyaan? Tanyakan lewat{" "}
        <Link href="/dashboard" className="underline underline-offset-2 hover:text-text">
          panel akun
        </Link>{" "}
        dan hubungi admin.
      </p>
    </div>
  );
}
