/** Official default HTML for identity confirmation emails (admin compose prefill). */
export function buildDefaultConfirmationBodyHtml(name: string): string {
  const safeName = name.trim() || "Valued Customer";

  return `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.75;">Dear ${safeName},</p>
<p style="margin:0 0 16px 0;font-size:15px;line-height:1.75;">We are pleased to confirm that your identity verification has been <strong>successfully completed and approved</strong> following a full review by our verification team.</p>
<p style="margin:0 0 12px 0;font-size:15px;line-height:1.75;">Your submission was processed in accordance with our standard identity assurance procedures. The following checks have been confirmed:</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:0 0 20px 0;">
  <tr><td style="padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
    <p style="margin:0 0 10px 0;font-size:13px;font-weight:700;color:#334155 !important;letter-spacing:0.04em;text-transform:uppercase;">Verification summary</p>
    <p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#1e293b !important;">&#10003;&nbsp; Biometric liveness verification completed</p>
    <p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#1e293b !important;">&#10003;&nbsp; Government-issued identity document reviewed</p>
    <p style="margin:0;font-size:14px;line-height:1.6;color:#1e293b !important;">&#10003;&nbsp; Identity match confirmed by our review team</p>
  </td></tr>
</table>
<p style="margin:0 0 16px 0;font-size:15px;line-height:1.75;">This message serves as <strong>official written confirmation</strong> of your verified identity status. No further action is required from you at this time.</p>
<p style="margin:0 0 16px 0;font-size:15px;line-height:1.75;">If you did not initiate this verification, or if you believe this message was sent in error, please contact our support team immediately so we can assist you.</p>
<p style="margin:0;font-size:15px;line-height:1.75;">Kind regards,<br/><strong>Verification Team</strong></p>`;
}
