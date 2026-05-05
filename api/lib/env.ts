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
};
