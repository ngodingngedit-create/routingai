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

## Deploy ke Vercel

### 1. Database di Neon

Buat project di Neon, lalu dari menu **Connect** ambil dua connection string:

| Yang dipakai | Untuk | Bentuk |
|---|---|---|
| Pooled | `DATABASE_URL` (runtime) | `postgresql://USER:PASS@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require` |
| Direct | `DIRECT_URL` (migrasi) | `postgresql://USER:PASS@ep-xxx.region.aws.neon.tech/neondb?sslmode=require` |

Direct URL wajib karena `prisma migrate deploy` tidak boleh lewat pooler.

### 2. Environment variables di Vercel

Isi untuk Production, Preview, dan Development:

```
DATABASE_URL         = <pooled Neon URL>
DIRECT_URL           = <direct Neon URL>
BETTER_AUTH_SECRET   = <32 byte random>
BETTER_AUTH_URL      = https://domain-anda.vercel.app
GOOGLE_CLIENT_ID     = <dari OAuth client>
GOOGLE_CLIENT_SECRET = <dari OAuth client>
APP_ENCRYPTION_KEY   = <64 hex random>
ADMIN_EMAIL          = <email Google kamu>
```

`BETTER_AUTH_URL` harus sama persis dengan domain produksi tanpa trailing slash, kalau tidak callback
OAuth diarahkan ke localhost. `ADMIN_EMAIL` menentukan siapa yang otomatis dapat role ADMIN saat login
pertama.

Buat secret dengan:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Build command

Build command disimpan di `vercel.json`, jadi bukan lagi diset di dashboard Vercel:

```
prisma generate && prisma migrate deploy && next build
```

`prisma generate` ditulis eksplisit karena cache install Vercel kadang menyimpan Prisma Client versi
lama. Migrasi jalan otomatis tiap deploy dan idempotent, jadi aman diulang. Kalau file `vercel.json`
dan setting dashboard berbeda, yang menang file `vercel.json`.

Seed tidak dijalankan di build. Seed bersifat idempotent dan hanya mengisi baris awal (provider,
draft model, pengaturan), jadi cukup dijalankan manual sekali:

```bash
npm run db:seed
```

Kalau nanti ada perubahan skema, `prisma migrate deploy` tetap otomatis di build.

### Troubleshooting

| Gejala di log build | Penyebab | Aksi |
|---|---|---|
| `Command failed with exit code 1: tsx prisma/seed.ts` | Seed lewat pooler atau Prisma Client belum ter-generate | Seed manual: `npm run db:seed` |
| `Environment variable not found: DIRECT_URL` | Env var Vercel belum lengkap | Isi `DIRECT_URL` di Project Settings |
| `Environment variable not found: DATABASE_URL` | `DATABASE_URL` belum diisi | Isi di Project Settings |
| `Can't reach database server` | Kredensial atau jaringan ke Neon bermasalah | Cek `curl https://domain-anda.vercel.app/api/health` |
| Halaman 500 dengan `The table public.Model does not exist` | `DATABASE_URL` dan `DIRECT_URL` menunjuk project atau database yang berbeda | Samakan keduanya, lalu `npm run db:deploy` |
| Halaman 500 dengan `Invalid lastRequest: Expected DateTime, provided Int` | Kolom `RateLimit.lastRequest` harus `BigInt` (epoch milidetik), bukan `DateTime` | `npm run db:deploy` dengan skema terbaru |
| Login Google balas 500 | Rate limit database gagal menulis, atau `BETTER_AUTH_URL` salah | `curl -X POST <domain>/api/auth/sign-in/social` untuk melihat redirect_uri yang dipakai |
| `redirect_uri_mismatch` dari Google | Redirect URI domain produksi belum terdaftar di OAuth client | Tambah `https://domain-anda.vercel.app/api/auth/callback/google` di Google Cloud Console |
| Halaman 500 tanpa pesan | Error runtime, cek Function Logs | `/api/health` menunjuk env var mana yang kurang |

### Checklist OAuth consent screen

Login Google gagal dengan "doesn't comply with Google's OAuth 2.0 policy" kalau konfigurasi consent
screen tidak valid. Yang wajib dicek:

| Field | Isi |
|---|---|
| Application home page URL | domain publik yang benar-benar bisa diakses, contoh `https://routingai.vercel.app` |
| Privacy policy URL | `https://routingai.vercel.app/privacy` |
| Terms of service URL | `https://routingai.vercel.app/terms` |
| App logo | upload file PNG langsung, contoh `public/logo-512.png`. Jangan pakai URL ke domain mati |
| Support email | email yang kamu pegang |
| Developer contact email | email yang kamu pegang |
| Publishing status | Publish, atau tambah akun sebagai Test user |
| Scopes | hanya `email`, `profile`, `openid` |

Dua aturan yang sering bikin gagal:

- **Jangan pakai domain yang tidak resolve.** Kalau home page menunjuk domain yang belum ada DNS-nya,
  Google menganggap app tidak memenuhi policy dan memblokir login dengan `400 invalid_request`.
- **Hanya pakai scope dasar.** Scope `email`, `profile`, `openid` tidak butuh verifikasi Google. Kalau
  ada scope sensitif lain (Drive, Gmail, Calendar), app wajib diverifikasi dan login bisa ditolak
  dengan pesan policy.

Logo untuk di-upload ke consent screen sudah ada di repo: `public/logo-512.png` dan
`public/logo-96.png`. Favicon browser memakai `app/icon.svg` yang memakai motif yang sama.

Redirect URI di OAuth client harus persis sama dengan domain produksi, formatnya:
`https://domain-anda/api/auth/callback/google`.

### Aturan menempel env var

Nilai env var yang dipaste dari chat atau terminal sering membawa **newline atau spasi di akhir**. Google
lalu menolak dengan `Error 400: invalid_request` karena `redirect_uri` jadi tidak valid. Dua cara
menghindarinya:

- Ketik ulang nilainya manual di dashboard Vercel, lalu tekan `End` dan pastikan tidak ada sisa
  karakter di belakang.
- Cek lewat `GET /api/health`. Field `warnings` memuat `env_value_whitespace` kalau ada env var yang
  punya spasi atau newline di awal/akhir. Aplikasi juga men-trim sendiri nilai yang dipakai, jadi
  whitespace tidak lagi mematikan login, tapi tetap perlu dibersihkan.

### Env var yang terkunci integrasi

Integrasi Prisma Postgres di Vercel membuat `DATABASE_URL`, `POSTGRES_URL`, dan
`PRISMA_DATABASE_URL` sebagai env var terkunci, jadi tidak bisa diedit dari dashboard. Tiga pilihan:

1. **Biarkan apa adanya (recommended).** `db.prisma.io` bukan PgBouncer, jadi parameter
   `pgbouncer=true` tidak relevan untuk Prisma Postgres. Yang butuh perhatian adalah cold start:
   compute Prisma Postgres suspend saat idle, dan koneksi pertama bisa melewati batas 10 detik default
   Prisma lalu gagal dengan `Can't reach database server`. Aplikasi sudah menambahkan
   `connect_timeout=20` sendiri ke connection string runtime, jadi tidak perlu mengubah env var.
2. **Disconnect integrasi** kalau memang mau mengedit nilainya: Vercel → Project → Storage → Prisma
   Postgres → menu ⋮ → Disconnect. Cek dulu di dashboard Prisma bahwa database-nya masih ada.
   Setelah disconnect, `DATABASE_URL` bisa diedit manual.
3. **Pakai nama env var sendiri** supaya tidak kena lock: buat `PRISMA_POOLED_URL` di Vercel, lalu
   ubah `url = env("PRISMA_POOLED_URL")` di `prisma/schema.prisma`. Konsekuensinya, semua dokumentasi
   dan `.env.example` harus ikut disesuaikan.

### Checklist env var produksi

| Env var | Isi yang benar |
|---|---|
| `BETTER_AUTH_URL` | domain publik aplikasi, tanpa trailing slash. Kalau masih localhost, login produksi tidak akan selesai |
| `DATABASE_URL` | connection string pooled dari database yang sama dengan `DIRECT_URL` |
| `DIRECT_URL` | connection string direct dari database yang sama, dipakai `prisma migrate deploy` |
| `BETTER_AUTH_SECRET` | 32 byte random, nilai sama untuk semua instance |
| `APP_ENCRYPTION_KEY` | 64 hex char random, jangan pernah diganti setelah kredensial provider disimpan |

`GET /api/health` memeriksa semua ini dan mengembalikan array `warnings` kalau ada yang tidak beres.
Array `recommendations` berisi saran yang tidak membuat deploy gagal.

### Mengakses dan mengubah data database

Empat cara, urut dari yang paling disarankan:

1. **Panel admin aplikasi** (`/admin`). Ini cara yang benar untuk operasional harian: kunci provider,
   harga model, peran user, saldo, order, dan pengaturan. Setiap perubahan saldo tercatat di tabel
   `CreditTx`, jadi riwayat dan saldo tidak pernah beda.
2. **Prisma Studio dari mesin ini** untuk browse dan edit tabel:
   ```bash
   npm run db:studio           # database produksi, koneksi direct
   npm run db:studio:backup    # database cadangan, dari BACKUP_DATABASE_URL
   ```
   Script ini memaksa koneksi direct, bukan pooled, karena Studio butuh koneksi stabil. Terbuka di
   `http://localhost:5555`. `db:studio` mengedit data produksi, jadi tutup Studio setelah selesai dan
   jangan mengubah `User.credits` serta `CreditTx` manual, karena itu merusak ledger kredit.
3. **SQL client** seperti psql, DBeaver, atau TablePlus, memakai direct URL:
   ```bash
   psql "postgres://USER:PASS@db.prisma.io:5432/postgres?sslmode=require"
   ```
4. **Dashboard Prisma Postgres**: Vercel → Storage → Prisma Postgres → Open Dashboard. Untuk melihat
   data, usage, rotasi password, dan reset database.

Catatan: mengubah saldo lewat SQL langsung melewati ledger `CreditTx`, jadi riwayat kredit user
jadi tidak sinkron dengan saldo. Untuk saldo selalu lewat panel admin.

Cek identitas database tanpa perlu konek ke app:

```bash
npm run db:info -- "<connection-string>"
```

### Ganti project database

Kalau database-nya diganti (misal pindah ke project Neon baru dari integrasi Vercel):

1. Isi `DATABASE_URL` (pooled) dan `DIRECT_URL` (direct) di Vercel dengan **project dan database yang
   sama**. `npm run db:info -- "<url>"` dipakai untuk memastikan tanpa deploy.
2. Redeploy. Build menjalankan `prisma migrate deploy` memakai `DIRECT_URL`, jadi schema ke-create
   otomatis di database itu.
3. Seed sekali di database yang sama: arahkan `.env` ke URL baru, lalu `npm run db:seed`.
4. Verifikasi `curl https://domain-anda.vercel.app/api/health`. `db.missingTables` harus kosong,
   `db.migrations` berisi 2 nama migration, dan `targets.sameTarget` harus `true`.

### Prisma Postgres

Integrasi Prisma Postgres (marketplace Vercel) punya dua URL dengan syarat berbeda:

| Dipakai untuk | Syarat param |
|---|---|
| `DATABASE_URL` (runtime) | `?sslmode=require&pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` (migrasi, seed) | `?sslmode=require` saja, **tanpa** `pgbouncer` |

Runtime tanpa `pgbouncer=true` gagal dengan error `prepared statements`. Direct URL dengan
`pgbouncer=true` gagal dengan error pooler. `npm run db:info -- "<url>"` prints mode dan param-nya
supaya tidak salah set.

Struktur env var yang dipakai integrasi ini:

```
PRISMA_DATABASE_URL = postgres://USER:PASS@db.prisma.io:5432/postgres?sslmode=require   # direct
POSTGRES_URL        = postgres://USER:PASS@db.prisma.io:5432/postgres?sslmode=require   # direct
```

`DATABASE_URL` untuk runtime adalah URL yang sama ditambah `&pgbouncer=true&connection_limit=1`.

### 4. OAuth untuk domain produksi

Di OAuth client Google, tambahkan:

- Authorized JavaScript origins: `https://domain-anda.vercel.app`
- Authorized redirect URIs: `https://domain-anda.vercel.app/api/auth/callback/google`

### 5. Cek hasil deploy

```bash
curl https://domain-anda.vercel.app/api/health
```

`ok: true` berarti semua env var lengkap dan database terjangkau. Kalau `ok: false`, field `missing`
menunjuk env var yang belum diisi dan field `db` menjelaskan masalah koneksi. Endpoint ini hanya
menampilkan nama variabel, tidak pernah nilainya.

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

## Operasional harian

### Login sebagai admin

Role ADMIN diberikan otomatis ke user yang emailnya sama dengan `ADMIN_EMAIL` di environment, saat
user itu dibuat. Untuk user yang sudah terdaftar, pakai perintah ini:

```bash
npm run admin:promote -- email.kamu@gmail.com
```

Perintahnya idempotent, jadi aman dijalankan berulang. Akun harus sudah pernah login di aplikasi
supaya barisnya ada di database. Perubahan role langsung berlaku tanpa logout, karena role dibaca
dari database tiap request.

### Menambah provider

Provider adalah upstream milikmu sendiri, misalnya akun OpenAI, Anthropic, Gemini, atau OpenRouter.

1. `/admin/providers`, pilih kartu provider yang mau dipakai
2. Isi **Kunci API provider** dengan kunci dari dashboard provider. Kunci dienkripsi sebelum disimpan,
   layar hanya menampilkan empat karakter terakhir
3. Base URL biarkan sesuai bawaan, ganti hanya kalau kamu memakai endpoint lain
4. Centang **Aktif dan bisa dipakai (kunci API wajib sudah terisi)**
5. Simpan

Provider tanpa kunci API tidak bisa diaktifkan. Modelnya akan dibalas `503 provider_not_configured`.

### Menambah model

1. `/admin/models`, kartu **Tambah model**
2. Isi field:

   | Field | Isi | Contoh |
   |---|---|---|
   | Slug (dipakai di request) | nama yang dipanggil di API, huruf kecil | `gpt-4o-mini` |
   | Nama tampilan | nama untuk manusia di katalog | `GPT-4o mini` |
   | Provider | pilih dari dropdown | OpenAI |
   | Nama model di provider | id persis di sisi provider | `gpt-4o-mini` |
   | Harga input USD / 1M token | dari halaman harga resmi provider | `0.15` |
   | Harga output USD / 1M token | dari halaman harga resmi provider | `0.60` |
   | Konteks maksimum | token context window | `128000` |
   | Output maksimum | token output per request | `16384` |
   | Deskripsi | opsional | |

3. Centang **Aktif dan tampil di katalog**
4. Simpan

Aturan: model aktif wajib punya harga input atau output lebih besar dari nol. Model yang harganya
belum diisi ditolak, supaya tidak ada request yang berjalan tanpa biaya yang jelas. Ambil harga dari
halaman harga resmi provider, karena tiap provider punya tarifnya sendiri.

Slug boleh memakai `/` dan `:` mengikuti penamaan provider, jadi slug publik boleh berbeda dari id
model di sisi provider. Contoh: slug `minimax-m3.1-flash:free` dengan nama model di provider
`minimax/minimax-m3.1-flash:free`.

### Menguji model

```bash
# daftar model aktif
curl https://domain-anda/v1/models -H "Authorization: Bearer sk-rly-..."

# panggil model
curl https://domain-anda/v1/chat/completions \
  -H "Authorization: Bearer sk-rly-..." \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Halo"}]}'
```

Kuncinya dibuat di `/dashboard/api-keys`. Nilai kunci asli hanya ditampilkan sekali.

### Kredit

Saldo dalam kredit, 1000 kredit setara 1 USD. Biaya satu request:

```
(token_input / 1e6 x harga_input + token_output / 1e6 x harga_output) x (1 + margin) x 1000
```

Saldo dipotong otomatis setelah request selesai. Kalau saldo kurang, request ditolak dengan
`402 insufficient_credits` sebelum dikirim ke provider. Batas minimum saldo dihitung dari
`max_tokens` yang diminta, jadi turunkan `max_tokens` kalau request ditolak padahal saldo terlihat
cukup.

Top up lewat `/dashboard/billing` → ajukan, lalu disetujui di `/admin/orders`.

### Kalau model tidak muncul di katalog

1. Provider-nya aktif?
2. Kunci API provider sudah terisi?
3. Modelnya aktif (centang Aktif dan tampil di katalog)?
4. Harga input atau output lebih besar dari nol?

`GET /v1/models` hanya menampilkan model yang aktif dan provider-nya aktif.

## Struktur

```
app/
  icon.svg                  favicon browser, motif route line
  page.tsx                 homepage, katalog dan data nyata dari database
  models/                  katalog model publik dan detail model
  docs/                    panduan pakai kunci
  login/ terms/ privacy/   login dan halaman legal
  dashboard/               panel pengguna: ringkasan, kunci, pemakaian, saldo
  admin/                   panel admin: ringkasan, pengguna, provider, model, top up, request, pengaturan
  v1/                      endpoint API publik (chat/completions, models, usage)
  api/auth/                Better Auth (login Google)
components/                komponen UI dan form
public/                    logo untuk di-upload ke OAuth consent screen
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
