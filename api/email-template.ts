/** Premium outbound email shell — dark, refined, consistent with the VerifyID brand. */
export function wrapPremiumEmailHtml(data: {
  headline: string;
  bodyHtml: string;
  footerNote?: string;
  accentColor: string;
  subtitle?: string;
  showVerifiedBadge?: boolean;
  innerBlocksHtml?: string;
  extraImagesHtml?: string;
}): string {
  const accent = data.accentColor || "#8b5cf6";
  const subtitle = data.subtitle
    ? `<p style="font-size:13px;color:rgba(255,255,255,0.7);margin:10px 0 0;font-weight:400;">${data.subtitle}</p>`
    : "";

  const verifiedBadge = data.showVerifiedBadge
    ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;"><tr><td style="padding:16px 20px;border-radius:14px;background:linear-gradient(135deg,rgba(16,185,129,0.14),rgba(139,92,246,0.1));border:1px solid rgba(52,211,153,0.35);text-align:center;">
      <p style="margin:0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#6ee7b7;font-weight:600;">Verified</p>
      <p style="margin:6px 0 0;font-size:15px;font-weight:600;color:#ecfdf5;">Identity confirmation complete</p>
    </td></tr></table>`
    : "";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#030308;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;border-radius:20px;overflow:hidden;border:1px solid rgba(139,92,246,0.22);box-shadow:0 24px 64px rgba(0,0,0,0.5);">
<tr><td style="background:linear-gradient(145deg,#0f0a1e 0%,#1a1035 42%,${accent} 100%);padding:36px 28px 32px;text-align:center;">
  <p style="margin:0 0 10px;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.55);font-weight:600;">VerifyID</p>
  <h1 style="font-size:24px;font-weight:600;margin:0;color:#ffffff;letter-spacing:-0.02em;line-height:1.25;">${data.headline}</h1>
  ${subtitle}
</td></tr>
<tr><td style="background:linear-gradient(180deg,#0c0c14 0%,#080810 100%);padding:32px 28px;">
  <div style="font-size:15px;line-height:1.75;color:#cbd5e1;">${data.bodyHtml}</div>
  ${verifiedBadge}
  ${data.innerBlocksHtml ?? ""}
  ${data.extraImagesHtml ?? ""}
</td></tr>
<tr><td style="padding:22px 28px;text-align:center;border-top:1px solid rgba(139,92,246,0.12);background:#050508;">
  <p style="font-size:11px;color:#64748b;margin:0;letter-spacing:0.06em;">${data.footerNote || "Sent via VerifyID"}</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}
