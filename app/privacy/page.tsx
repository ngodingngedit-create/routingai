import Link from "next/link";

export const metadata = {
  title: "Kebijakan privasi",
  description: "Data apa yang disimpan RoutingAI dan bagaimana data itu digunakan.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-text">Kebijakan privasi</h1>
      <p className="mt-2 text-sm text-muted">Data yang dikumpulkan sedikit dan tujuannya jelas.</p>

      <div className="mt-8 space-y-6 text-sm text-muted">
        <section>
          <h2 className="text-base font-semibold text-text">Data akun</h2>
          <p className="mt-1.5">
            Saat login dengan Google, nama, email, dan foto profil disimpan untuk keperluan login. Tidak
            ada kata sandi yang dikumpulkan.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text">Kunci API</h2>
          <p className="mt-1.5">
            Kunci API disimpan dalam bentuk hash SHA-256. Kunci asli tidak pernah disimpan ulang, jadi
            admin pun tidak bisa melihat kunci milikmu.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text">Riwayat pemakaian</h2>
          <p className="mt-1.5">
            Yang dicatat: nama model, jumlah token, biaya, waktu, dan status permintaan. Isi prompt dan
            respons tidak disimpan.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text">Berbagi data</h2>
          <p className="mt-1.5">
            Permintaan diteruskan ke provider yang dipilih, jadi isi prompt dan respons melewati provider
            tersebut dengan kebijakan privasi mereka. Data lain tidak dijual dan tidak dibagikan ke pihak
            ketiga untuk marketing.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text">Penghapusan</h2>
          <p className="mt-1.5">
            Kamu bisa meminta penghapusan akun dan seluruh riwayatnya. Hubungi admin, penghapusan dilakukan
            pada account yang sedang login.
          </p>
        </section>
      </div>

      <p className="mt-10 text-sm text-muted">
        Lihat juga{" "}
        <Link href="/terms" className="underline underline-offset-2 hover:text-text">
          syarat layanan
        </Link>
        .
      </p>
    </div>
  );
}
