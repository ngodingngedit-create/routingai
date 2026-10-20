export const env = {
  authSecret: process.env.BETTER_AUTH_SECRET ?? "",
  authUrl: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  adminEmail: (process.env.ADMIN_EMAIL ?? "").toLowerCase(),
  encryptionKey: process.env.APP_ENCRYPTION_KEY ?? "",
};

export const googleConfigured = Boolean(env.googleClientId && env.googleClientSecret);
