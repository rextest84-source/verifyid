import { ErrorMessages } from "@contracts/constants";
import { initTRPC, TRPCError } from "@trpc/server";
import * as cookie from "cookie";
import superjson from "superjson";
import { verifyAdminComposeToken, AdminComposeSession } from "./admin-compose-session";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const createRouter = t.router;
export const publicQuery = t.procedure;

const requireAuth = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: ErrorMessages.unauthenticated,
    });
  }

  return next({ ctx: { ...ctx, user: ctx.user } });
});

function requireRole(role: string) {
  return t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== role) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: ErrorMessages.insufficientRole,
      });
    }

    return next({ ctx: { ...ctx, user: ctx.user } });
  });
}

export const authedQuery = t.procedure.use(requireAuth);
export const adminQuery = authedQuery.use(requireRole("admin"));

export async function hasAdminComposeAccess(ctx: TrpcContext): Promise<boolean> {
  if (ctx.user?.role === "admin") return true;
  const cookies = cookie.parse(ctx.req.headers.get("cookie") || "");
  const token = cookies[AdminComposeSession.cookieName];
  if (!token) return false;
  return verifyAdminComposeToken(token);
}

const requireAdminCompose = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!(await hasAdminComposeAccess(ctx))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }

  return next({ ctx });
});

export const adminComposeQuery = t.procedure.use(requireAdminCompose);
