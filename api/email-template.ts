/** Inject readable text color into body HTML — email clients often ignore parent color on <p>. */
export function normalizeEmailBodyHtml(html: string, textColor = "#1e293b"): string {
  return html.replace(/<p(\s[^>]*)?>/gi, (match) => {
    if (/style\s*=/i.test(match)) {
      return match.replace(/style\s*=\s*["']([^"']*)["']/i, (_, styles) => {
        if (/color\s*:/i.test(styles)) return match;
        return `style="${styles};color:${textColor};"`;
      });
    }
    return `<p style="margin:0 0 16px 0;color:${textColor};font-size:15px;line-height:1.75;">`;
  });
}

/** Premium outbound email shell — dark header, high-contrast light body for mobile clients. */
export function wrapPremiumEmailHtml(data: {
  headline: string;
  bodyHtml: string;
  brandLabel?: string;
  footerNote?: string;
  accentColor: string;
  subtitle?: string;
  showVerifiedBadge?: boolean;
  innerBlocksHtml?: string;
  extraImagesHtml?: string;
}): string {
  const accent = data.accentColor || "#8b5cf6";
  const brandLabel = data.brandLabel?.trim() || "VerifyID";
  const bodyText = normalizeEmailBodyHtml(data.bodyHtml, "#1e293b");

  const subtitle = data.subtitle
    ? `<p style="font-size:14px;color:rgba(255,255,255,0.92);margin:12px 0 0;font-weight:400;text-shadow:0 1px 2px rgba(0,0,0,0.25);">${data.subtitle}</p>`
    : "";

  const verifiedBadge = data.showVerifiedBadge
    ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;"><tr><td style="padding:18px 20px;border-radius:14px;background:linear-gradient(135deg,#ecfdf5 0%,#f5f3ff 100%);border:1px solid #6ee7b7;text-align:center;">
      <p style="margin:0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#059669;font-weight:700;">Verified</p>
      <p style="margin:8px 0 0;font-size:16px;font-weight:600;color:#064e3b;">Identity confirmation complete</p>
    </td></tr></table>`
    : "";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head>
<body style="margin:0;padding:0;background:#eef0f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-text-size-adjust:100%;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr><td align="center" style="padding:32px 16px;">
<table width="560" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width:560px;width:100%;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 16px 48px rgba(15,23,42,0.12);">
<tr><td style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 38%,${accent} 100%);padding:36px 28px 32px;text-align:center;">
  <p style="margin:0 0 10px;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.85);font-weight:600;">${brandLabel}</p>
  <h1 style="font-size:26px;font-weight:700;margin:0;color:#ffffff;letter-spacing:-0.02em;line-height:1.25;text-shadow:0 2px 8px rgba(0,0,0,0.35);">${data.headline}</h1>
  ${subtitle}
</td></tr>
<tr><td style="background:#ffffff;padding:32px 28px;">
  <div style="font-size:15px;line-height:1.75;color:#1e293b;">${bodyText}</div>
  ${verifiedBadge}
  ${data.innerBlocksHtml ?? ""}
  ${data.extraImagesHtml ?? ""}
</td></tr>
<tr><td style="padding:20px 28px;text-align:center;border-top:1px solid #e2e8f0;background:#f8fafc;">
  <p style="font-size:12px;color:#64748b;margin:0;letter-spacing:0.04em;">${data.footerNote || "Sent via VerifyID"}</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}
