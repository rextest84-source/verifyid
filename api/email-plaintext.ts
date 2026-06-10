/** Strip HTML to a readable plain-text part (improves spam scores vs HTML-only). */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#10003;/g, "✓")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildPremiumEmailPlainText(data: {
  brandLabel?: string;
  headline: string;
  subtitle?: string;
  bodyHtml: string;
  footerNote?: string;
  showVerifiedBadge?: boolean;
}): string {
  const parts = [
    data.brandLabel?.trim() || "VerifyID",
    "",
    data.headline,
    data.subtitle?.trim() || "",
    "",
    htmlToPlainText(data.bodyHtml),
  ];

  if (data.showVerifiedBadge) {
    parts.push("", "VERIFIED", "Identity confirmation complete");
  }

  parts.push("", "—", data.footerNote?.trim() || "Sent via VerifyID");

  return parts.filter((line, i, arr) => !(line === "" && arr[i - 1] === "")).join("\n");
}
