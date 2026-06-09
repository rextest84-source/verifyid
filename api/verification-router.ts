import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { createRouter, publicQuery, adminComposeQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { verifications } from "@db/schema";
import { sendTestEmail, sendVerificationConfirmation } from "./email-service";
import { env } from "./lib/env";

const statusFilter = z.enum(["all", "in_progress", "pending_review", "approved", "rejected"]);

function toAdminSummary(row: typeof verifications.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    status: row.status,
    livenessVerified: row.livenessVerified,
    idVerified: row.idVerified,
    confirmationSentAt: row.confirmationSentAt,
    createdAt: row.createdAt,
    hasLivenessPhoto: !!row.livenessImageUrl,
    hasIdPhoto: !!row.idImageUrl,
  };
}

export const verificationRouter = createRouter({
  create: publicQuery
    .input(z.object({ name: z.string().min(1), email: z.string().email() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [result] = await db.insert(verifications).values({
        name: input.name,
        email: input.email,
      });
      return { id: Number(result.insertId) };
    }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db
        .select()
        .from(verifications)
        .where(eq(verifications.id, input.id))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        status: row.status,
        livenessVerified: row.livenessVerified,
        idVerified: row.idVerified,
        confirmationSentAt: row.confirmationSentAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    }),

  updateLiveness: publicQuery
    .input(z.object({ id: z.number(), imageUrl: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(verifications)
        .set({
          livenessVerified: new Date(),
          ...(input.imageUrl ? { livenessImageUrl: input.imageUrl } : {}),
        })
        .where(eq(verifications.id, input.id));
      return { success: true };
    }),

  resetLiveness: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(verifications)
        .set({ livenessVerified: null, livenessImageUrl: null })
        .where(eq(verifications.id, input.id));
      return { success: true };
    }),

  resetIdDocument: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(verifications)
        .set({ idVerified: null, idImageUrl: null })
        .where(eq(verifications.id, input.id));
      return { success: true };
    }),

  updateIdDocument: publicQuery
    .input(z.object({ id: z.number(), imageUrl: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(verifications)
        .set({ idVerified: new Date(), idImageUrl: input.imageUrl })
        .where(eq(verifications.id, input.id));
      return { success: true };
    }),

  submit: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const rows = await db
        .select()
        .from(verifications)
        .where(eq(verifications.id, input.id))
        .limit(1);
      if (!rows.length) throw new Error("Verification not found");
      const row = rows[0];

      if (!row.livenessVerified || !row.idVerified) {
        throw new Error("Please complete liveness and ID document steps first");
      }

      await db
        .update(verifications)
        .set({ status: "pending_review" })
        .where(eq(verifications.id, input.id));

      return {
        success: true,
        message: "Your verification has been submitted for review. Our team will contact you once it is complete.",
      };
    }),

  listForAdmin: adminComposeQuery
    .input(z.object({ status: statusFilter.default("pending_review") }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db
        .select()
        .from(verifications)
        .orderBy(desc(verifications.createdAt));

      const filtered =
        input.status === "all"
          ? rows
          : rows.filter((row) => row.status === input.status);

      return filtered.map(toAdminSummary);
    }),

  getForAdmin: adminComposeQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db
        .select()
        .from(verifications)
        .where(eq(verifications.id, input.id))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return {
        ...toAdminSummary(row),
        livenessImageUrl: row.livenessImageUrl,
        idImageUrl: row.idImageUrl,
      };
    }),

  sendConfirmation: adminComposeQuery
    .input(
      z.object({
        id: z.number(),
        from: z.string().min(3).optional(),
        subject: z.string().min(1).max(200),
        headline: z.string().min(1).max(200),
        bodyHtml: z.string().min(1).max(20000),
        footerNote: z.string().max(500).optional(),
        accentColor: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .optional(),
        replyTo: z.string().email().optional(),
        extraAttachmentUrls: z.array(z.string()).max(5).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const rows = await db
        .select()
        .from(verifications)
        .where(eq(verifications.id, input.id))
        .limit(1);
      const row = rows[0];
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Verification not found" });
      }
      if (!row.livenessVerified || !row.idVerified) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This person has not completed verification yet",
        });
      }

      const result = await sendVerificationConfirmation({
        name: row.name,
        email: row.email,
        livenessImageUrl: row.livenessImageUrl,
        idImageUrl: row.idImageUrl,
        from: input.from || env.resendFromEmail,
        subject: input.subject,
        headline: input.headline,
        bodyHtml: input.bodyHtml,
        footerNote: input.footerNote,
        accentColor: input.accentColor,
        replyTo: input.replyTo,
        extraAttachmentUrls: input.extraAttachmentUrls,
      });

      if (!result.sent) {
        return result;
      }

      await db
        .update(verifications)
        .set({ status: "approved", confirmationSentAt: new Date() })
        .where(eq(verifications.id, input.id));

      return result;
    }),

  testEmail: publicQuery
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const result = await sendTestEmail(input.email);
      return result;
    }),
});
