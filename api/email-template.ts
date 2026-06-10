/** Styles that keep header/body readable when mobile clients apply dark-mode inversion. */
const EMAIL_CLIENT_STYLES = `<style type="text/css">
  :root { color-scheme: light only; supported-color-schemes: light; }
  .email-header-brand, .email-header-title, .email-header-subtitle {
    color: #ffffff !important;
    -webkit-text-fill-color: #ffffff !important;
  }
  .email-body, .email-body p, .email-body li, .email-body td, .email-body strong, .email-body span {
    color: #1e293b !important;
    -webkit-text-fill-color: #1e293b !important;
  }
  .email-footer { color: #64748b !important; -webkit-text-fill-color: #64748b !important; }
  @media (prefers-color-scheme: dark) {
    .email-header-cell { background-color: #312e81 !important; }
    .email-header-brand, .email-header-title, .email-header-subtitle {
      color: #ffffff !important;
      -webkit-text-fill-color: #ffffff !important;
    }
    .email-body-cell { background-color: #ffffff !important; }
    .email-body, .email-body p, .email-body li, .email-body td, .email-body strong, .email-body span {
      color: #1e293b !important;
      -webkit-text-fill-color: #1e293b !important;
    }
    .email-footer-cell { background-color: #f8fafc !important; }
    .email-footer { color: #64748b !important; }
  }
  [data-ogsc] .email-header-title, [data-ogsc] .email-header-brand, [data-ogsc] .email-header-subtitle {
    color: #ffffff !important;
  }
  u + .body .email-header-title, u + .body .email-header-brand, u + .body .email-header-subtitle {
    color: #ffffff !important;
  }
</style>`;

/** Inject readable text color into body HTML — email clients often ignore parent color on <p>. */
export function normalizeEmailBodyHtml(html: string, textColor = "#1e293b"): string {
  const forced = `${textColor} !important`;

  let result = html.replace(/color\s*:\s*[^;"']+(!important)?\s*;?/gi, "");

  result = result.replace(/<p(\s[^>]*)?>/gi, (match) => {
    if (/style\s*=/i.test(match)) {
      return match.replace(/style\s*=\s*["']([^"']*)["']/i, (_, styles) => {
        const cleaned = styles.replace(/color\s*:\s*[^;]+;?/gi, "").trim();
        const prefix = cleaned ? `${cleaned};` : "";
        return `style="${prefix}margin:0 0 16px 0;color:${forced};font-size:15px;line-height:1.75;"`;
      });
    }
    return `<p style="margin:0 0 16px 0;color:${forced};font-size:15px;line-height:1.75;">`;
  });

  result = result.replace(/<strong(\s[^>]*)?>/gi, (match) => {
    if (/style\s*=/i.test(match)) return match;
    return `<strong style="color:${forced};">`;
  });

  result = result.replace(/<li(\s[^>]*)?>/gi, (match) => {
    if (/style\s*=/i.test(match)) {
      return match.replace(/style\s*=\s*["']([^"']*)["']/i, (_, styles) => {
        const cleaned = styles.replace(/color\s*:\s*[^;]+;?/gi, "").trim();
        const prefix = cleaned ? `${cleaned};` : "";
        return `style="${prefix}color:${forced};font-size:14px;line-height:1.6;"`;
      });
    }
    return `<li style="color:${forced};font-size:14px;line-height:1.6;margin-bottom:6px;">`;
  });

  return result;
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
    ? `<p class="email-header-subtitle" style="font-size:14px;color:#ffffff !important;-webkit-text-fill-color:#ffffff !important;margin:12px 0 0;font-weight:400;">${data.subtitle}</p>`
    : "";

  const verifiedBadge = data.showVerifiedBadge
    ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;"><tr><td style="padding:18px 20px;border-radius:14px;background-color:#ecfdf5;background:linear-gradient(135deg,#ecfdf5 0%,#f5f3ff 100%);border:1px solid #6ee7b7;text-align:center;">
      <p style="margin:0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#059669 !important;font-weight:700;">Verified</p>
      <p style="margin:8px 0 0;font-size:16px;font-weight:600;color:#064e3b !important;">Identity confirmation complete</p>
    </td></tr></table>`
    : "";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">${EMAIL_CLIENT_STYLES}</head>
<body class="email-body" style="margin:0;padding:0;background-color:#eef0f6;background:#eef0f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-text-size-adjust:100%;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr><td align="center" style="padding:32px 16px;background-color:#eef0f6;">
<table width="560" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width:560px;width:100%;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 16px 48px rgba(15,23,42,0.12);">
<tr><td class="email-header-cell" bgcolor="#312e81" style="background-color:#312e81;background:linear-gradient(135deg,#1e1b4b 0%,#312e81 38%,${accent} 100%);padding:36px 28px 32px;text-align:center;">
  <p class="email-header-brand" style="margin:0 0 10px;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#ffffff !important;-webkit-text-fill-color:#ffffff !important;font-weight:600;">${brandLabel}</p>
  <h1 class="email-header-title" style="font-size:26px;font-weight:700;margin:0;color:#ffffff !important;-webkit-text-fill-color:#ffffff !important;letter-spacing:-0.02em;line-height:1.25;">${data.headline}</h1>
  ${subtitle}
</td></tr>
<tr><td class="email-body-cell" bgcolor="#ffffff" style="background-color:#ffffff;padding:32px 28px;">
  <div class="email-body" style="font-size:15px;line-height:1.75;color:#1e293b !important;">${bodyText}</div>
  ${verifiedBadge}
  ${data.innerBlocksHtml ?? ""}
  ${data.extraImagesHtml ?? ""}
</td></tr>
<tr><td class="email-footer-cell" bgcolor="#f8fafc" style="padding:20px 28px;text-align:center;border-top:1px solid #e2e8f0;background-color:#f8fafc;">
  <p class="email-footer" style="font-size:12px;color:#64748b !important;margin:0;letter-spacing:0.04em;">${data.footerNote || "Sent via VerifyID"}</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}
