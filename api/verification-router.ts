import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { verifications } from "@db/schema";
import { eq } from "drizzle-orm";
import { sendAdminAlert, sendTestEmail, sendUserConfirmation } from "./email-service";

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
      return rows[0] ?? null;
    }),

  updateLiveness: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(verifications)
        .set({ livenessVerified: new Date() })
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

      const [userEmail, adminEmail] = await Promise.all([
        sendUserConfirmation(row.email, row.name || "User"),
        sendAdminAlert({
          name: row.name || "User",
          email: row.email,
          idImageUrl: row.idImageUrl,
          livenessVerified: row.livenessVerified,
          idVerified: row.idVerified,
          createdAt: row.createdAt,
        }),
      ]);

      return {
        success: true,
        message: "Your verification has been submitted for review.",
        emailStatus: {
          user: userEmail,
          admin: adminEmail,
        },
      };
    }),

  testEmail: publicQuery
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const result = await sendTestEmail(input.email);
      return result;
    }),
});
