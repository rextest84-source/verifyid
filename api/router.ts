import { adminRouter } from "./admin-router";
import { authRouter } from "./auth-router";
import { emailRouter } from "./email-router";
import { verificationRouter } from "./verification-router";
import { createRouter, publicQuery } from "./middleware";
import { sendTestEmail } from "./email-service";
import { env } from "./lib/env";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  health: publicQuery.query(() => ({
    ok: true,
    resendConfigured: !!env.resendApiKey,
    resendKeyPrefix: env.resendApiKey ? env.resendApiKey.slice(0, 8) + "..." : "none",
    resendFromEmail: env.resendFromEmail,
    adminNotificationEmail: env.adminNotificationEmail,
    env: process.env.NODE_ENV || "development",
    ts: Date.now(),
  })),
  testEmail: publicQuery
    .input((val: unknown) => {
      const v = val as { email?: string };
      if (!v?.email) throw new Error("Email required");
      return v;
    })
    .mutation(async ({ input }) => {
      return sendTestEmail(input.email);
    }),
  admin: adminRouter,
  auth: authRouter,
  email: emailRouter,
  verification: verificationRouter,
});

export type AppRouter = typeof appRouter;
