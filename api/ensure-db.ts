import { execSync } from "node:child_process";
import { env } from "./lib/env";

export function ensureDatabaseSchema(): void {
  if (!env.databaseUrl) {
    console.warn("[db] DATABASE_URL not set — skipping schema push.");
    return;
  }

  try {
    console.log("[db] Applying schema...");
    execSync("npx drizzle-kit push --force", {
      stdio: "inherit",
      env: process.env,
    });
    console.log("[db] Schema ready.");
  } catch (error) {
    console.error("[db] Schema push failed:", error);
    throw error;
  }
}
