import { Prisma } from "@prisma/client";
import { isValidSlug, SLUG_HINT } from "@/lib/slug";

export type ValidationResult = { ok: true } | { ok: false; message: string };

export function validateModelInput(input: {
  slug: string;
  displayName: string;
  providerId: string;
  upstreamModel: string;
  priceIn: number;
  priceOut: number;
  contextWindow: number;
  maxOutput: number;
  enabled: boolean;
}): ValidationResult {
  if (!isValidSlug(input.slug)) {
    return {
      ok: false,
      message: SLUG_HINT,
    };
  }
  if (!input.displayName.trim()) return { ok: false, message: "Nama tampilan wajib diisi." };
  if (!input.providerId) return { ok: false, message: "Pilih provider model." };
  if (!input.upstreamModel.trim()) {
    return { ok: false, message: "Nama model di sisi provider wajib diisi." };
  }
  if (!Number.isFinite(input.priceIn) || input.priceIn < 0) {
    return { ok: false, message: "Harga input harus angka positif dalam USD per 1 juta token." };
  }
  if (!Number.isFinite(input.priceOut) || input.priceOut < 0) {
    return { ok: false, message: "Harga output harus angka positif dalam USD per 1 juta token." };
  }
  if (input.enabled && input.priceIn === 0 && input.priceOut === 0) {
    return {
      ok: false,
      message: "Harga input atau output harus diisi sebelum model diaktifkan.",
    };
  }
  if (!Number.isFinite(input.contextWindow) || input.contextWindow < 0) {
    return { ok: false, message: "Konteks maksimum harus angka positif." };
  }
  if (!Number.isFinite(input.maxOutput) || input.maxOutput < 0) {
    return { ok: false, message: "Output maksimum harus angka positif." };
  }
  return { ok: true };
}

export function validateProviderInput(input: {
  name: string;
  baseUrl: string;
  apiKey: string;
}): ValidationResult {
  if (!input.name.trim()) return { ok: false, message: "Nama provider wajib diisi." };
  if (!input.baseUrl.startsWith("http")) {
    return { ok: false, message: "Base URL harus diawali http:// atau https://." };
  }
  if (input.apiKey && input.apiKey.length < 16) {
    return {
      ok: false,
      message: "Kunci API provider terlalu pendek, cek lagi di dashboard provider.",
    };
  }
  return { ok: true };
}

export function validateAdjustInput(input: { amount: number; note: string }): ValidationResult {
  if (!Number.isFinite(input.amount) || input.amount === 0) {
    return { ok: false, message: "Jumlah kredit harus angka dan tidak boleh nol." };
  }
  if (!input.note.trim()) {
    return {
      ok: false,
      message: "Tulis alasan penyesuaian, ini tercatat di riwayat kredit pengguna.",
    };
  }
  return { ok: true };
}

export function validateTopUpInput(input: { credits: number }): ValidationResult {
  if (!Number.isFinite(input.credits) || input.credits <= 0) {
    return { ok: false, message: "Jumlah kredit harus lebih besar dari nol." };
  }
  if (input.credits > 1_000_000) {
    return { ok: false, message: "Maksimal 1.000.000 kredit per permintaan top up." };
  }
  return { ok: true };
}

export function validateSettingsInput(input: {
  signupCredits: number;
  markupPercent: number;
  creditsPerUsd: number;
}): ValidationResult {
  if (!Number.isFinite(input.signupCredits) || input.signupCredits < 0) {
    return { ok: false, message: "Kredit awal harus angka positif atau nol." };
  }
  if (!Number.isFinite(input.markupPercent) || input.markupPercent < 0) {
    return { ok: false, message: "Margin harus angka positif atau nol." };
  }
  if (!Number.isFinite(input.creditsPerUsd) || input.creditsPerUsd <= 0) {
    return { ok: false, message: "Kredit per USD harus lebih besar dari nol." };
  }
  return { ok: true };
}

export function toDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}
