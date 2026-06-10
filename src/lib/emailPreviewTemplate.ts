import { normalizeEmailBodyHtml } from "../../api/email-template";

const PREVIEW_DARK_MODE_STYLES = `<style>
  .email-preview-header-brand, .email-preview-header-title, .email-preview-header-subtitle {
    color: #ffffff !important;
  }
  .email-preview-body, .email-preview-body p, .email-preview-body td, .email-preview-body strong {
    color: #1e293b !important;
  }
</style>`;

/** Premium email HTML for live preview (mirrors outbound template style). */
export function buildPremiumEmailPreviewHtml(options: {
  headline: string;
  bodyHtml: string;
  brandLabel: string;
  footerNote: string;
  accentColor: string;
  subtitle?: string;
  showVerifiedBadge?: boolean;
  imageDataUrls?: string[];
}): string {
  const { headline, bodyHtml, brandLabel, footerNote, accentColor, subtitle, showVerifiedBadge, imageDataUrls } =
    options;

  const bodyText = normalizeEmailBodyHtml(
    bodyHtml || "<p>Your message appears here.</p>",
    "#1e293b",
  );

  const imgs = (imageDataUrls ?? [])
    .map(
      (url) =>
        `<div style="margin-top:20px;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;"><img src="${url}" alt="" style="max-width:100%;display:block;" /></div>`,
    )
    .join("");

  const verifiedBadge = showVerifiedBadge
    ? `<div style="margin-top:24px;padding:18px 20px;border-radius:14px;background:linear-gradient(135deg,#ecfdf5 0%,#f5f3ff 100%);border:1px solid #6ee7b7;text-align:center;">
        <p style="margin:0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#059669 !important;font-weight:700;">Verified</p>
        <p style="margin:8px 0 0;font-size:16px;font-weight:600;color:#064e3b !important;">Identity confirmation complete</p>
      </div>`
    : "";

  const subtitleHtml = subtitle
    ? `<p class="email-preview-header-subtitle" style="margin:12px 0 0;font-size:14px;color:#ffffff !important;font-weight:400;">${subtitle}</p>`
    : "";

  return `${PREVIEW_DARK_MODE_STYLES}<div style="font-family:'Segoe UI',system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;background:#eef0f6;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 16px 48px rgba(15,23,42,0.12);">
    <div style="background-color:#312e81;background:linear-gradient(135deg,#1e1b4b 0%,#312e81 38%,${accentColor} 100%);padding:36px 28px 32px;text-align:center;">
      <p class="email-preview-header-brand" style="margin:0 0 8px;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#ffffff !important;font-weight:600;">${brandLabel?.trim() || "VerifyID"}</p>
      <h1 class="email-preview-header-title" style="margin:0;color:#ffffff !important;font-size:26px;font-weight:700;letter-spacing:-0.02em;line-height:1.25;">${headline || "Your headline"}</h1>
      ${subtitleHtml}
    </div>
    <div class="email-preview-body" style="background-color:#ffffff;padding:32px 28px;font-size:15px;line-height:1.75;color:#1e293b !important;">
      ${bodyText}
      ${verifiedBadge}
      ${imgs}
    </div>
    <div style="padding:20px 28px;text-align:center;border-top:1px solid #e2e8f0;background-color:#f8fafc;">
      <p style="margin:0;font-size:12px;color:#64748b !important;letter-spacing:0.04em;">${footerNote || "Sent via VerifyID"}</p>
    </div>
  </div>`;
}
