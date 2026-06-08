import { Resend } from "resend";
import { readFile } from "fs/promises";
import path from "path";
import { env } from "./lib/env";

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (!env.resendApiKey) return null;
  if (!resendClient) resendClient = new Resend(env.resendApiKey);
  return resendClient;
}

function log(stage: string, data: Record<string, unknown>) {
  console.log(`[EMAIL ${stage}]`, JSON.stringify(data));
}

export type EmailSendResult = {
  sent: boolean;
  mock: boolean;
  id?: string;
  error?: string;
};

/* ====== READ IMAGE AS BASE64 ====== */

async function imageToBase64(imageUrl: string | null): Promise<string | null> {
  if (!imageUrl) return null;
  try {
    const filePath = path.join(process.cwd(), imageUrl.startsWith("/") ? imageUrl.slice(1) : imageUrl);
    const buf = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mime = ext === ".png" ? "image/png" : "image/jpeg";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch (e: any) {
    log("IMAGE_ERROR", { url: imageUrl, err: e.message });
    return null;
  }
}

async function sendEmail(payload: {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
}): Promise<EmailSendResult> {
  const resend = getResend();
  if (!resend) {
    return { sent: false, mock: true, error: "No Resend API key configured" };
  }

  try {
    const result = await resend.emails.send({
      from: env.resendFromEmail,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
    return { sent: true, mock: false, id: result?.data?.id };
  } catch (err: any) {
    return { sent: false, mock: true, error: err?.message ?? "Email send failed" };
  }
}

/* ====== USER CONFIRMATION EMAIL ====== */

export async function sendUserConfirmation(userEmail: string, name: string): Promise<EmailSendResult> {
  log("USER_START", { to: userEmail, from: env.resendFromEmail });

  const result = await sendEmail({
    to: userEmail,
    subject: "VerifyID - Submission Received",
    html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:32px 16px;">
<table width="480" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
<tr><td align="center" style="padding-bottom:24px;">
  <div style="width:48px;height:48px;background:linear-gradient(135deg,#0ea5e9,#22d3ee);border-radius:12px;display:inline-block;text-align:center;line-height:48px;">
    <span style="color:white;font-size:24px;">&#128274;</span>
  </div>
  <h1 style="font-size:22px;font-weight:700;margin:12px 0 0 0;color:#0f172a;">VerifyID</h1>
</td></tr>
<tr><td style="background:#ffffff;border-radius:16px;padding:24px;border:1px solid #e2e8f0;text-align:center;">
  <p style="font-size:15px;color:#475569;margin:0 0 12px 0;">Hello ${name},</p>
  <p style="font-size:15px;color:#475569;margin:0 0 24px 0;">We have received your identity verification submission.</p>
  <div style="background:#f8fafc;border-radius:12px;padding:20px;border:2px dashed #cbd5e1;margin-bottom:24px;">
    <p style="font-size:13px;color:#64748b;margin:0 0 8px 0;">Status</p>
    <p style="font-size:18px;font-weight:700;color:#0ea5e9;margin:0;">Under Review</p>
  </div>
  <p style="font-size:14px;color:#475569;margin:0 0 8px 0;">Our team is reviewing your documents. You will receive a confirmation email as soon as your verification is complete.</p>
  <p style="font-size:13px;color:#94a3b8;margin:0;">This typically takes 1-2 business days.</p>
</td></tr>
<tr><td style="padding-top:24px;">
  <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:12px;padding:16px;text-align:center;">
    <p style="font-size:12px;color:#92400e;margin:0;font-weight:600;">AUTOMATED BOT MAIL - DO NOT RESPOND</p>
    <p style="font-size:11px;color:#b45309;margin:4px 0 0 0;">This email was sent automatically by the VerifyID verification system. Replies are not monitored.</p>
  </div>
</td></tr>
<tr><td style="padding-top:24px;text-align:center;">
  <p style="font-size:12px;color:#94a3b8;margin:0;">If you did not submit this verification, you can safely ignore this email.</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`,
  });

  if (result.sent) log("USER_SENT", { to: userEmail, id: result.id });
  else log("USER_ERROR", { to: userEmail, err: result.error });
  return result;
}

/* ====== ADMIN NOTIFICATION EMAIL ====== */

export async function sendAdminAlert(data: {
  name: string;
  email: string;
  idImageUrl: string | null;
  livenessVerified: Date | null;
  idVerified: Date | null;
  createdAt: Date | null;
}): Promise<EmailSendResult> {
  const admin = env.adminNotificationEmail;
  log("ADMIN_START", { to: admin, applicant: data.email, from: env.resendFromEmail });

  const fmt = (d: Date | null) => (d ? new Date(d).toLocaleString() : "N/A");
  const img64 = await imageToBase64(data.idImageUrl);

  const imgBlock = img64
    ? `<tr><td style="background:#fff;border-radius:12px;padding:16px;border:1px solid #e2e8f0;">
         <p style="font-size:13px;font-weight:700;color:#0f172a;margin:0 0 12px 0;">ID Document Photo</p>
         <img src="${img64}" style="max-width:100%;max-height:400px;border-radius:8px;border:1px solid #e2e8f0;display:block;" />
       </td></tr><tr><td style="height:16px;"></td></tr>`
    : `<tr><td style="background:#fff;border-radius:12px;padding:16px;border:1px solid #e2e8f0;">
         <p style="font-size:13px;color:#94a3b8;margin:0;">No ID document uploaded.</p>
       </td></tr><tr><td style="height:16px;"></td></tr>`;

  const result = await sendEmail({
    to: admin,
    subject: `[VerifyID] New Submission - ${data.name}`,
    html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:32px 16px;">
<table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:16px;padding:24px;text-align:center;">
  <h1 style="font-size:20px;font-weight:700;margin:0;color:#e2e8f0;">VerifyID</h1>
  <p style="font-size:13px;color:#94a3b8;margin:4px 0 0 0;">Admin Notification - New Submission</p>
</td></tr>
<tr><td style="height:16px;"></td></tr>
<tr><td style="background:#f8fafc;border-radius:16px;padding:20px;border:1px solid #e2e8f0;">
  <h2 style="font-size:14px;font-weight:700;color:#0f172a;margin:0 0 16px 0;text-transform:uppercase;letter-spacing:0.5px;">Applicant Details</h2>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;color:#475569;">
    <tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;width:40%;"><strong>Name</strong></td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">${data.name}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;"><strong>Email</strong></td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">${data.email}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;"><strong>Liveness Verified</strong></td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">${fmt(data.livenessVerified)}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;"><strong>ID Uploaded</strong></td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">${fmt(data.idVerified)}</td></tr>
    <tr><td style="padding:8px 0;"><strong>Submitted</strong></td><td style="padding:8px 0;">${fmt(data.createdAt)}</td></tr>
  </table>
</td></tr>
<tr><td style="height:16px;"></td></tr>
${imgBlock}
<tr><td style="background:#fef3c7;border:1px solid #fde68a;border-radius:12px;padding:14px;text-align:center;">
  <p style="font-size:12px;color:#92400e;margin:0;font-weight:600;">AUTOMATED BOT MAIL - DO NOT RESPOND</p>
  <p style="font-size:11px;color:#b45309;margin-top:4px;">This email was sent automatically by the VerifyID verification system. Replies are not monitored.</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`,
  });

  if (result.sent) log("ADMIN_SENT", { to: admin, id: result.id });
  else log("ADMIN_ERROR", { to: admin, err: result.error });
  return result;
}

/* ====== TEST EMAIL ====== */

export async function sendTestEmail(toEmail: string): Promise<EmailSendResult> {
  log("TEST_START", { to: toEmail, from: env.resendFromEmail });

  const result = await sendEmail({
    to: toEmail,
    subject: "VerifyID - Email Test",
    text: "If you received this, VerifyID email delivery is working.",
  });

  if (result.sent) log("TEST_SENT", { to: toEmail, id: result.id });
  else log("TEST_ERROR", { to: toEmail, err: result.error });
  return result;
}
