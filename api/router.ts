import { authRouter } from "./auth-router";
import { verificationRouter } from "./verification-router";
import { createRouter, publicQuery } from "./middleware";
import { sendTestEmail } from "./email-service";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  health: publicQuery.query(() => ({
    ok: true,
    resendConfigured: !!process.env.RESEND_API_KEY,
    resendKeyPrefix: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.slice(0, 8) + "..." : "none",
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
  auth: authRouter,
  verification: verificationRouter,
});

export type AppRouter = typeof appRouter;
