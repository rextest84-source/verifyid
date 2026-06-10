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
  getDefaults: adminComposeQuery.query(() => {
    const from = env.resendFromEmail;
    const isTestSender = /@resend\.dev>/i.test(from) || from.includes("onboarding@resend.dev");
    return {
      defaultFrom: from,
      resendConfigured: !!env.resendApiKey,
      isTestSender,
      domainSetupHint: isTestSender
        ? "Verify dsc-infoverifyid.com at resend.com/domains and set RESEND_FROM_EMAIL to VerifyID <noreply@dsc-infoverifyid.com> on Railway."
        : null,
    };
  }),

  sendCustom: adminComposeQuery
    .input(
      z.object({
        from: z.string().min(3).optional(),
        to: emailList,
        subject: z.string().min(1).max(200),
        headline: z.string().min(1).max(200),
        bodyHtml: z.string().min(1).max(20000),
        brandLabel: z.string().max(100).optional(),
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
        brandLabel: input.brandLabel,
        footerNote: input.footerNote,
        accentColor: input.accentColor,
        replyTo: input.replyTo,
        attachmentUrls: input.attachmentUrls,
      });
    }),
});
