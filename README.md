# RoutingAI

Aggregator dan router model AI: satu kunci API untuk beberapa provider, saldo per akun, katalog model
dengan harga nyata, dan panel admin untuk mengatur semuanya.

- Login Google saja, tidak ada password
- Kunci API user disimpan sebagai hash SHA-256, nilai asli tampil sekali
- Kredensial provider dienkripsi AES-256-GCM
- Biaya dihitung dari token yang dilaporkan provider, dipotong dari saldo kredit
- Format request dan respons mengikuti OpenAI Chat Completions, streaming ikut didukung

## Kebutuhan

- Node.js 20.9 atau lebih baru (dibangun dengan Node 24)
- PostgreSQL 14 atau lebih baru (lokal: 18)

## Setup

```bash
npm install
cp .env.example .env
```

Isi `.env`:

```env
DATABASE_URL="postgresql://postgres@127.0.0.1:5432/routingai?schema=public"
BETTER_AUTH_SECRET="<32 byte random>"
BETTER_AUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
ADMIN_EMAIL="email.kamu@gmail.com"
APP_ENCRYPTION_KEY="<64 hex char random>"
```

Buat dua secret dengan:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Buat database lalu jalankan migrasi dan seed:

```bash
createdb -U postgres routingai
npm run db:migrate
npm run db:seed
```

Jalankan:

```bash
npm run dev
```

Buka http://localhost:3000.

## Login Google

1. Google Cloud Console, buat project baru (atau pakai yang ada)
2. Aktifkan Google Identity Platform atau API "Google+ API" sesuai wizard
3. OAuth consent screen: atur User type External, isi nama app, email kontak, dan developer email
4. Credentials > OAuth client ID > Web application:
   - Name: `RoutingAI local`
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
5. Salin Client ID dan Client Secret ke `.env`, lalu restart server

Akun yang emailnya sama dengan `ADMIN_EMAIL` otomatis mendapat role ADMIN saat pertama kali daftar.
Role juga bisa diubah dari panel admin.

## Request pertama

1. Masuk dengan Google
2. Panel admin > Provider: isi Base URL dan kunci API provider, lalu aktifkan
3. Panel admin > Model: isi slug (mis. `gpt-4o-mini`), harga input dan output per 1 juta token dalam USD,
   model di provider, lalu aktifkan
4. Panel pengguna > Kunci API: buat kunci, salin sekali saja
5. Panggil endpoint

Model tanpa harga tidak bisa dipakai, dan katalog menandainya "belum diatur" supaya tidak ada biaya
yang tidak jelas.

## Memakai API

```bash
curl https://domain-anda/v1/chat/completions \
  -H "Authorization: Bearer sk-rly-..." \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Halo"}]}'
```

```python
from openai import OpenAI

client = OpenAI(base_url="https://domain-anda/v1", api_key="sk-rly-...")
reply = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Halo"}],
)
```

Endpoint:

| Endpoint | Fungsi |
|---|---|
| `POST /v1/chat/completions` | Chat completion, streaming dan non streaming |
| `GET /v1/models` | Model aktif beserta harga |
| `GET /v1/usage` | Ringkasan pemakaian kunci yang dipakai |

Kode error: `401 invalid_api_key`, `402 insufficient_credits`, `404 model_not_found`,
`429 rate_limited`, `503 provider_not_configured`, `503 model_price_missing`.

## Kredit dan harga

- 1000 kredit setara 1 USD (bisa diubah di Panel admin > Pengaturan)
- Biaya = (token input x harga input + token output x harga output) x (1 + margin admin)
- Batas minimum saldo diperiksa sebelum request dikirim, berdasarkan `max_tokens` yang diminta
- Semua mutasi saldo tercatat di riwayat kredit, tidak ada perubahan saldo tanpa catatan

## Skrip

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan |
| `npm run build` | Build produksi |
| `npm run typecheck` | Cek tipe |
| `npm run lint` | ESLint |
| `npm test` | Unit test biaya, adapter provider, validasi form |
| `npm run db:migrate` | Migrasi Prisma |
| `npm run db:seed` | Isi provider, draft model, pengaturan awal |
| `npm run db:studio` | Prisma Studio |
| `npm run smoke` | Uji end to end router dengan provider tiruan (dev server harus hidup) |
| `npm run check:pages` | Cek status dan isi semua halaman (dev server harus hidup) |
| `npm run check:actions` | Cek alur kunci, top up, dan penyesuaian kredit |
| `npx tsx --env-file=.env scripts/dev-session.ts` | Cetak cookie sesi lokal untuk menguji halaman ber-session |

## Struktur

```
app/
  page.tsx                 homepage, katalog dan data nyata dari database
  models/                  katalog model publik dan detail model
  docs/                    panduan pakai kunci
  login/ terms/ privacy/   login dan halaman legal
  dashboard/               panel pengguna: ringkasan, kunci, pemakaian, saldo
  admin/                   panel admin: ringkasan, pengguna, provider, model, top up, request, pengaturan
  v1/                      endpoint API publik (chat/completions, models, usage)
  api/auth/                Better Auth (login Google)
components/                komponen UI dan form
lib/
  auth.ts                  konfigurasi Better Auth, rate limit, aturan daftar
  billing.ts               perhitungan biaya dari token
  providers/               adapter OpenAI compatible, OpenRouter, Anthropic, Gemini
  services.ts              logika mutasi (kunci, top up, penyesuaian kredit)
  validation.ts            aturan validasi form
  usage.ts                 pencatatan pemakaian dan pemotongan saldo
  crypto.ts                hash kunci API dan enkripsi kredensial provider
prisma/schema.prisma       model data
scripts/                   skrip cek dan pembantu pengembangan
tests/                     unit test
DESIGN.md                  arah visual
```

## Catatan keamanan

- Kunci API user hanya disimpan sebagai hash SHA-256, tidak ada jalur untuk membaca ulang
- Kredensial provider dienkripsi AES-256-GCM, kunci enkripsi dari `APP_ENCRYPTION_KEY`
- Rate limit login (10 percobaan per menit per IP) dan rate limit per kunci API (default 60 per menit)
- Daftar bisa dibatasi whitelist domain email dan bisa ditutup lewat mode maintenance
- Isi prompt dan respons tidak pernah disimpan, hanya jumlah token, biaya, dan status

## Yang belum ada

Payment gateway otomatis (top up masih manual oleh admin), fallback chain multi provider per slug,
Redis untuk rate limit terdistribusi, playground chat di web, notifikasi email, multi currency.
