import { Prisma } from "@prisma/client";

const numberFormatter = new Intl.NumberFormat("id-ID");
const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  return Number(value.toString());
}

export function formatCredits(value: Prisma.Decimal | number | string): string {
  const number = toNumber(value);
  return numberFormatter.format(Math.round(number * 1000) / 1000);
}

export function formatTokens(value: number): string {
  return numberFormatter.format(value);
}

const usdFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 6,
});

export function formatUsdPerMillion(value: Prisma.Decimal | number | string): string {
  const number = toNumber(value);
  if (number === 0) return "belum diatur";
  return `$${usdFormatter.format(number)}`;
}

export function formatDate(value: Date): string {
  return dateFormatter.format(value);
}

export function formatDateTime(value: Date): string {
  return dateTimeFormatter.format(value);
}
