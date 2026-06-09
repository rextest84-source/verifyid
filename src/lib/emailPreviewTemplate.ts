/** Premium email HTML for live preview (mirrors outbound template style). */
export function buildPremiumEmailPreviewHtml(options: {
  headline: string;
  bodyHtml: string;
  footerNote: string;
  accentColor: string;
  showVerifiedBadge?: boolean;
  imageDataUrls?: string[];
}): string {
  const { headline, bodyHtml, footerNote, accentColor, showVerifiedBadge, imageDataUrls } = options;

  const imgs = (imageDataUrls ?? [])
    .map(
      (url) =>
        `<div style="margin-top:20px;border-radius:14px;overflow:hidden;border:1px solid rgba(139,92,246,0.2);"><img src="${url}" alt="" style="max-width:100%;display:block;" /></div>`,
    )
    .join("");

  const verifiedBadge = showVerifiedBadge
    ? `<div style="margin-top:24px;padding:16px 20px;border-radius:14px;background:linear-gradient(135deg,rgba(16,185,129,0.12),rgba(139,92,246,0.08));border:1px solid rgba(52,211,153,0.35);text-align:center;">
        <p style="margin:0;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#6ee7b7;font-weight:600;">Verified</p>
        <p style="margin:6px 0 0;font-size:15px;font-weight:600;color:#ecfdf5;">Identity confirmation complete</p>
      </div>`
    : "";

  return `<div style="font-family:'Segoe UI',system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;background:#07070d;border-radius:20px;overflow:hidden;border:1px solid rgba(139,92,246,0.22);box-shadow:0 24px 64px rgba(0,0,0,0.45);">
    <div style="background:linear-gradient(145deg,#0f0a1e 0%,#1a1035 45%,${accentColor} 100%);padding:36px 28px 32px;text-align:center;position:relative;">
      <div style="width:48px;height:48px;margin:0 auto 16px;border-radius:14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;">
        <span style="font-size:22px;line-height:1;">🛡</span>
      </div>
      <p style="margin:0 0 8px;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.55);font-weight:600;">VerifyID</p>
      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:600;letter-spacing:-0.02em;line-height:1.25;">${headline || "Your headline"}</h1>
    </div>
    <div style="background:linear-gradient(180deg,#0c0c14 0%,#080810 100%);padding:32px 28px;color:#cbd5e1;font-size:15px;line-height:1.75;">
      ${bodyHtml || "<p style='margin:0;color:#94a3b8;'>Your message appears here.</p>"}
      ${verifiedBadge}
      ${imgs}
    </div>
    <div style="padding:22px 28px;text-align:center;border-top:1px solid rgba(139,92,246,0.12);background:#050508;">
      <p style="margin:0;font-size:11px;color:#64748b;letter-spacing:0.06em;">${footerNote || "Sent via VerifyID"}</p>
    </div>
  </div>`;
}
