# DESIGN.md

Arah visual RoutingAI. Dokumen ini sumber arah, `antislop` dipakai sebagai filter di atasnya.
Nama produk masih kerja (`RoutingAI`), wordmark dan motif menunggu persetujuan pemilik.

## Identitas

RoutingAI adalah lapisan routing untuk model AI: satu kunci, banyak provider, biaya jelas.
Karakter yang dikejar: tenang, teknis, jujur. Tidak ada angka yang dipoles, tidak ada janji yang tidak diukur.

- Nama kerja: RoutingAI
- Bahasa antarmuka: Indonesia, istilah teknis (model, token, streaming, provider) tetap English
- Nada: singkat, tanpa pujian diri, selalu menyebut angka aslinya

## Design Read

> Membaca produk ini sebagai: konsol API developer untuk tim kecil, bahasa visual "teknis tenang",
> dial ENERGY 2 / RHYTHM 2 / MOTION 1.

## Palet

Dua warna inti netral plus satu accent. Netral tidak dihitung sebagai warna inti.

| Token | Terang | Gelap | Alasan |
|---|---|---|---|
| bg | `#FBFAF7` | `#0C0E10` | Kertas hangat di terang, tinta di gelap. Netral supaya accent satu warna yang benar-benar terlihat |
| surface | `#FFFFFF` | `#15181B` | Satu lapis elevate dari bg, cukup untuk memisahkan panel dari halaman |
| surface-2 | `#F4F2ED` | `#1B1F23` | Isi tabel dan header tabel |
| line | `#E5E2DC` | `#23282D` | Pemisah. Border lebih banyak daripada shadow |
| text | `#14171A` | `#E9ECEE` | Rasio kontras di atas 12:1 di kedua tema |
| muted | `#5B636A` | `#98A2AB` | Teks sekunder, minimal 4.5:1 di kedua tema |
| accent | `#B03A08` | `#FF6A2B` | Oranye "Ignition". Dipakai hanya di CTA utama, fokus keyboard, dan node aktif di diagram alur |
| accent-soft | `rgba(176,58,8,.09)` | `rgba(255,106,43,.14)` | Latar penanda status aktif dan item nav terpilih |
| danger | `#B42318` | `#F97066` | Status gagal dan danger action |
| ok | `#15803D` | `#4ADE80` | Status sukses |

Pilihan accent lain kalau pemilik ingin: `#15803D` (hijau,nuansa kredit) atau `#1D4ED8` (biru, nuansa data).
Oranye dipilih supaya tidak masuk kelompok biru-ungu-ungu default yang paling sering dipakai AI.

## Tipografi

- Archivo untuk seluruh UI. Alasan: grotesk tegap dengan x-height tinggi, enak dibaca di ukuran kecil,
  dan bukan Inter/Geist/Space Grotesk yang jadi pilihan default.
- JetBrains Mono untuk ID model, kunci API, dan blok kode. Alasan: string teknis harus mono dan mudah
  disalin, mono di sini punya fungsi, bukan gaya.
- Tidak ada heading monospace besar, tidak ada label uppercase dengan letter-spacing lebar.

## Bentuk

| Elemen | Nilai | Alasan |
|---|---|---|
| Radius input dan tombol | 6px | Bentuk kerja, bukan pil |
| Radius kartu dan panel | 10px | Terlihat satu keluarga dengan tombol |
| Radius badge | none, pakai teks | Badge status cukup dengan warna teks, tidak perlu pil |
| Shadow | hanya popup dan menu | Border sudah memisahkan lapisan, shadow dipakai untuk elemen yang benar-benar di atas halaman |

## Motif

"Route line": garis penghubung vertikal dengan satu node accent, dipakai di diagram alur permintaan
(homepage) dan di motif brand. Alasan: routing adalah inti produk, jadi motifnya adalah jalur, bukan
ornamen. Dipakai di satu tempat per halaman, bukan di setiap kartu.

## Gerak

Dial MOTION 1: hanya transisi warna dan hover, tanpa animasi loop, tanpa scroll reveal.
Alasan: halaman ini dipakai berulang kali saat integration, gerak yang terus berjalan cuma menambah beban.

## Tema

Gelap jadi default. Alasan: produk ini konsol developer yang dipakai BERADA di layar gelap, bukan halaman baca.
Toggle terang tersedia dan keduanya wajib benar (kontras, border, tabel, form, dan diagram diuji di dua tema).
Pilihan tema disimpan di `localStorage` dengan kunci `routingai-theme`.

## Komposisi halaman

Tidak ada template "hero + 3 kartu + testimoni + FAQ + CTA". Susunan mengikuti isi:

- **Homepage**: hero (nilai + CTA + diagram alur nyata) → katalog model langsung dari database →
  quickstart dua langkah dengan kode yang jalan → penjelasan hitungan kredit → FAQ yang berbasis
  pertanyaan nyata pengguna → footer.
- **Dashboard pengguna**: satu fokus (saldo) → baris fakta sekunder → request terakhir.
- **Panel admin**: satu fokus (hal yang perlu keputusan admin) → baris angka operasional → tautan managing.

## Yang tidak dipakai

Testimoni, logo bar "trusted by", statistik tanpa sumber, badge dekoratif, terminal palsu di hero,
grid bento, tiga tier harga, ikon dari library generik, emoji di teks.

## Yang perlu persetujuan pemilik

1. Nama produk (saat ini `RoutingAI`)
2. Wordmark + motif route line di `components/brand-mark.tsx`
3. Pilihan accent (oranye / hijau / biru)
4. Bahasa antarmuka Indonesia, atau English
