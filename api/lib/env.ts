import "dotenv/config";

function get(name: string, required = false): string {
  const value = process.env[name];
  if (!value && required) {
    console.warn(`Missing env var: ${name}`);
  }
  return value ?? "";
}

export const env = {
  appId: get("APP_ID"),
  appSecret: get("APP_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: get("DATABASE_URL"),
  kimiAuthUrl: get("KIMI_AUTH_URL"),
  kimiOpenUrl: get("KIMI_OPEN_URL"),
  ownerUnionId: get("OWNER_UNION_ID"),
  resendApiKey: get("RESEND_API_KEY"),
  resendFromEmail: get("RESEND_FROM_EMAIL") || "VerifyID <onboarding@resend.dev>",
  adminNotificationEmail: get("ADMIN_NOTIFICATION_EMAIL") || "rextest84@gmail.com",
  /** Password for /compose admin login (set on Railway). */
  adminComposePassword: get("ADMIN_COMPOSE_PASSWORD"),
  /** JWT secret for admin compose cookie; falls back to APP_SECRET. */
  adminComposeSecret: get("ADMIN_COMPOSE_SECRET") || get("APP_SECRET"),
};
