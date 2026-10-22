import { headers } from "next/headers";

export type OriginInput = {
  appUrl?: string | null;
  host?: string | null;
  proto?: string | null;
};

/**
 * Menentukan origin publik aplikasi.
 *
 * `APP_URL` menang kalau diisi, jadi domain bisa dikunci manual saat memakai proxy
 * atau domain sendiri. Kalau tidak, origin diambil dari header request, sehingga
 * contoh di docs dan homepage selalu cocok dengan domain yang sedang dibuka.
 */
export function resolveOrigin(input: OriginInput): string {
  const appUrl = input.appUrl?.trim();
  if (appUrl) return appUrl.replace(/\/+$/, "");

  const host = input.host?.trim();
  if (host) {
    const forwardedProto = input.proto?.trim();
    const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
    const proto = forwardedProto || (isLocal ? "http" : "https");
    return `${proto}://${host}`;
  }

  return "http://localhost:3000";
}

export async function getPublicOrigin(): Promise<string> {
  const requestHeaders = await headers();
  return resolveOrigin({
    appUrl: process.env.APP_URL,
    host: requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
    proto: requestHeaders.get("x-forwarded-proto"),
  });
}

/** Base URL untuk SDK OpenAI, contoh https://routingai.vercel.app/v1 */
export async function getApiBaseUrl(): Promise<string> {
  return `${await getPublicOrigin()}/v1`;
}
