import { z } from "zod";
import { createRouter, adminComposeQuery } from "./middleware";
import { sendCustomEmail } from "./email-service";
import { env } from "./lib/env";

const emailList = z
  .string()
  .min(5)
  .max(1000)
  .refine(
    (val) => {
      const parts = val.includes(",") ? val.split(",").map((e) => e.trim()) : [val.trim()];
      return parts.every((e) => z.string().email().safeParse(e).success);
    },
    { message: "Invalid recipient email address" },
  );

export const emailRouter = createRouter({
  getDefaults: adminComposeQuery.query(() => ({
    defaultFrom: env.resendFromEmail,
    resendConfigured: !!env.resendApiKey,
  })),

  sendCustom: adminComposeQuery
    .input(
      z.object({
        from: z.string().min(3).optional(),
        to: emailList,
        subject: z.string().min(1).max(200),
        headline: z.string().min(1).max(200),
        bodyHtml: z.string().min(1).max(20000),
        footerNote: z.string().max(500).optional(),
        accentColor: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .optional(),
        replyTo: z.string().email().optional(),
        attachmentUrls: z.array(z.string()).max(5).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const toList = input.to.includes(",")
        ? input.to.split(",").map((e) => e.trim()).filter(Boolean)
        : [input.to.trim()];

      return sendCustomEmail({
        from: input.from || env.resendFromEmail,
        to: toList,
        subject: input.subject,
        headline: input.headline,
        bodyHtml: input.bodyHtml,
        footerNote: input.footerNote,
        accentColor: input.accentColor,
        replyTo: input.replyTo,
        attachmentUrls: input.attachmentUrls,
      });
    }),
});
