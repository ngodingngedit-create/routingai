import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Penanda error yang bersifat sementara: koneksi hilang, transaksi ditutup, atau
 * database sedang bangun dari mode suspend.
 */
const TRANSIENT_MARKERS = [
  "Transaction not found",
  "Transaction API error",
  "timed out",
  "Timed out",
  "Can't reach database server",
  "P2028",
  "P1001",
  "P2024",
];

function isTransient(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string } | null)?.code;
  if (code && ["P2028", "P1001", "P2024"].includes(code)) return true;
  return TRANSIENT_MARKERS.some((marker) => message.includes(marker));
}

/**
 * Menjalankan operasi database dengan satu kali percobaan ulang kalau errornya
 * bersifat sementara.
 *
 * Prisma Postgres suspend compute saat idle. Saat bangun, koneksi pertama bisa
 * ditolak seketika, bukan timeout, sehingga satu request bisa gagal dengan 500
 * padahal database sehat sebentar kemudian. Retry singkat dengan jeda投稿者
 * membuat这种情况 tidak terasa pengguna.
 */
export async function withDbRetry<T>(
  fn: () => Promise<T>,
  options: { attempts?: number } = {},
): Promise<T> {
  const attempts = options.attempts ?? 2;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransient(error) || attempt === attempts - 1) throw error;
      try {
        await prisma.$queryRaw`SELECT 1`;
      } catch {
        // koneksi masih belum siap, percobaan berikutnya yang menentukan
      }
    }
  }

  throw lastError;
}

/**
 * Menjalankan transaksi interaktif dengan batas waktu yang lebih longgar dan satu
 * kali percobaan ulang.
 *
 * Prisma Postgres suspend compute saat idle, jadi koneksi pertama bisa melewati
 * batas 5 detik default transaksi dan ditutup paksa. Tanpa retry, pencatatan
 * pemakaian gagal dan request berakhir 500 padahal provider sudah terlayani.
 */
export async function runTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options: { attempts?: number } = {},
): Promise<T> {
  return withDbRetry(
    () => prisma.$transaction(fn, { maxWait: 15_000, timeout: 20_000 }),
    options,
  );
}
