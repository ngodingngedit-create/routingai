/**
 * Aturan slug model.
 *
 * Slug adalah nama yang dipanggil pengguna di request API, jadi sering mengikuti
 * penamaan provider. OpenRouter memakai prefix provider (slash) dan sufiks varian
 * (titik dua), misal `minimax/minimax-m3.1-flash:free`.
 */
export const SLUG_PATTERN = /^[a-z0-9][a-z0-9._/:-]{0,59}$/;

export const SLUG_HINT =
  "Slug harus huruf kecil, angka, titik, garis, garis miring, atau titik dua. Contoh: gpt-4o-mini atau minimax-m3.1-flash:free.";

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}

/**
 * Next.js mengirim segmen route dalam bentuk ter-encode, jadi `minimax:free`
 * sampai sebagai `minimax%3Afree`. Decoding-nya dibuat aman supaya string yang
 * bukan escape valid tidak meledakkan halaman.
 */
export function decodeSlugParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** URL aman untuk tautan ke halaman detail model. */
export function modelHref(slug: string): string {
  return `/models/${encodeURIComponent(slug)}`;
}
