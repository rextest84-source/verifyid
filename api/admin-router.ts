import { z } from "zod";
import * as cookie from "cookie";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, hasAdminComposeAccess } from "./middleware";
import {
  AdminComposeSession,
  signAdminComposeToken,
} from "./admin-compose-session";
import { getSessionCookieOptions } from "./lib/cookies";
import { env } from "./lib/env";

export const adminRouter = createRouter({
  status: publicQuery.query(async ({ ctx }) => ({
    isAdmin: await hasAdminComposeAccess(ctx),
    passwordLoginEnabled: !!env.adminComposePassword,
  })),

  login: publicQuery
    .input(z.object({ password: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      if (!env.adminComposePassword || input.password !== env.adminComposePassword) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid admin password",
        });
      }

      const token = await signAdminComposeToken();
      if (!token) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Admin session not configured (set APP_SECRET on Railway)",
        });
      }

      const opts = getSessionCookieOptions(ctx.req.headers);
      ctx.resHeaders.append(
        "set-cookie",
        cookie.serialize(AdminComposeSession.cookieName, token, {
          httpOnly: opts.httpOnly,
          path: opts.path,
          sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
          secure: opts.secure,
          maxAge: AdminComposeSession.maxAgeSec,
        }),
      );

      return { success: true };
    }),

  logout: publicQuery.mutation(async ({ ctx }) => {
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(AdminComposeSession.cookieName, "", {
        httpOnly: opts.httpOnly,
        path: opts.path,
        sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
        secure: opts.secure,
        maxAge: 0,
      }),
    );
    return { success: true };
  }),
});
