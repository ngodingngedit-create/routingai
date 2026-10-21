export const env = {
  authSecret: process.env.BETTER_AUTH_SECRET ?? "",
  // .trim() menjaga supaya spasi atau newline di akhir nilai env var tidak
  // merusak URL callback OAuth.
  authUrl: (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").trim(),
  googleClientId: (process.env.GOOGLE_CLIENT_ID ?? "").trim(),
  googleClientSecret: (process.env.GOOGLE_CLIENT_SECRET ?? "").trim(),
  adminEmail: (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase(),
  encryptionKey: (process.env.APP_ENCRYPTION_KEY ?? "").trim(),
};

export const googleConfigured = Boolean(env.googleClientId && env.googleClientSecret);
