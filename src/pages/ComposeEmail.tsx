import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { trpc } from "@/providers/trpc";
import AdminLoginGate from "@/components/AdminLoginGate";
import { buildPremiumEmailPreviewHtml } from "@/lib/emailPreviewTemplate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { uploadImageFile } from "@/lib/upload";
import {
  ArrowLeft,
  CheckCircle2,
  ImagePlus,
  Loader2,
  LogOut,
  Mail,
  Send,
  Trash2,
  X,
} from "lucide-react";

const ACCENT_PRESETS = ["#10b981", "#8b5cf6", "#0ea5e9", "#f59e0b", "#ec4899", "#6366f1"] as const;

function formatEmailError(error: string): string {
  if (
    error.includes("verify a domain") ||
    error.includes("testing emails") ||
    error.includes("resend.dev")
  ) {
    return `${error}\n\nTo fix: (1) Verify dsc-infoverifyid.com at resend.com/domains (2) On Railway set RESEND_FROM_EMAIL to VerifyID <noreply@dsc-infoverifyid.com> (3) Redeploy. Until then you can only send to rextest84@gmail.com.`;
  }
  return error;
}

function handleSendResult(
  data: { sent: boolean; id?: string; error?: string },
  setResult: (r: { ok: boolean; message: string }) => void,
) {
  if (data.sent && data.id) {
    setResult({ ok: true, message: `Email delivered (Resend ID: ${data.id})` });
  } else if (data.sent) {
    setResult({ ok: true, message: "Email accepted by Resend" });
  } else {
    setResult({
      ok: false,
      message: formatEmailError(
        data.error || "Email could not be sent. Check sender domain in Resend.",
      ),
    });
  }
}

export default function ComposeEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const verificationId = Number(searchParams.get("verificationId") || 0) || null;
  const prefilledRef = useRef(false);

  const utils = trpc.useUtils();
  const { data: adminStatus, isLoading: adminLoading, refetch: refetchAdmin } =
    trpc.admin.status.useQuery();

  const { data: defaults } = trpc.email.getDefaults.useQuery(undefined, {
    enabled: !!adminStatus?.isAdmin,
  });

  const { data: verification } = trpc.verification.getForAdmin.useQuery(
    { id: verificationId ?? 0 },
    { enabled: !!adminStatus?.isAdmin && !!verificationId },
  );

  const logoutMutation = trpc.admin.logout.useMutation({
    onSuccess: () => void utils.admin.status.invalidate(),
  });

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [subject, setSubject] = useState("");
  const [headline, setHeadline] = useState("");
  const [bodyHtml, setBodyHtml] = useState("<p>Hello,</p><p>Your message here.</p>");
  const [footerNote, setFooterNote] = useState("Sent via VerifyID");
  const [accentColor, setAccentColor] = useState<string>(ACCENT_PRESETS[0]);
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const verificationMode = !!verificationId && !!verification;

  useEffect(() => {
    if (!verification || prefilledRef.current) return;
    prefilledRef.current = true;
    setTo(verification.email);
    setSubject("VerifyID — Your Identity Has Been Verified");
    setHeadline("Identity Verified");
    setBodyHtml(
      `<p>Hello ${verification.name},</p><p>We are pleased to confirm that your identity verification has been completed successfully.</p>`,
    );
    setAccentColor("#7c3aed");
  }, [verification]);

  const effectiveFrom = from || defaults?.defaultFrom || "VerifyID <onboarding@resend.dev>";

  const sendCustomMutation = trpc.email.sendCustom.useMutation({
    onSuccess: (data) => handleSendResult(data, setResult),
    onError: (err) => setResult({ ok: false, message: formatEmailError(err.message) }),
  });

  const sendConfirmationMutation = trpc.verification.sendConfirmation.useMutation({
    onSuccess: (data) => {
      handleSendResult(data, setResult);
      if (data.sent) void utils.verification.listForAdmin.invalidate();
    },
    onError: (err) => setResult({ ok: false, message: formatEmailError(err.message) }),
  });

  const deleteMutation = trpc.verification.deleteForAdmin.useMutation({
    onSuccess: () => {
      void utils.verification.listForAdmin.invalidate();
      navigate("/admin");
    },
  });

  const isSending = sendCustomMutation.isPending || sendConfirmationMutation.isPending;

  const handleDeleteSubmission = () => {
    if (!verificationId || !verification) return;
    const ok = window.confirm(
      `Delete verification for "${verification.name}"?\n\nNo confirmation email will be sent.`,
    );
    if (ok) deleteMutation.mutate({ id: verificationId });
  };

  const previewHtml = useMemo(
    () =>
      buildPremiumEmailPreviewHtml({
        headline,
        bodyHtml,
        footerNote,
        accentColor,
        showVerifiedBadge: verificationMode,
        imageDataUrls: verificationMode
          ? []
          : attachmentUrls.map((u) => (u.startsWith("/") ? u : `/${u}`)),
      }),
    [headline, bodyHtml, footerNote, accentColor, verificationMode, attachmentUrls],
  );

  const handleAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImageFile(file, file.name);
      if (url) setAttachmentUrls((prev) => [...prev, url]);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSend = () => {
    setResult(null);
    const recipient = verificationMode ? verification?.email : to.trim();
    if (!recipient || !subject.trim() || !headline.trim() || !bodyHtml.trim()) {
      setResult({ ok: false, message: "Please fill in receiver, subject, headline, and body." });
      return;
    }

    if (verificationMode && verificationId) {
      sendConfirmationMutation.mutate({
        id: verificationId,
        from: effectiveFrom,
        subject: subject.trim(),
        headline: headline.trim(),
        bodyHtml: bodyHtml.trim(),
        footerNote: footerNote.trim() || undefined,
        accentColor,
        replyTo: replyTo.trim() || undefined,
        includeLivenessPhoto: false,
        includeIdPhoto: false,
      });
      return;
    }

    sendCustomMutation.mutate({
      from: effectiveFrom,
      to: recipient,
      subject: subject.trim(),
      headline: headline.trim(),
      bodyHtml: bodyHtml.trim(),
      footerNote: footerNote.trim() || undefined,
      accentColor,
      replyTo: replyTo.trim() || undefined,
      attachmentUrls: attachmentUrls.length ? attachmentUrls : undefined,
    });
  };

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    );
  }

  if (!adminStatus?.isAdmin) {
    return (
      <div className="px-4 py-16 w-full max-w-full overflow-x-hidden">
        <AdminLoginGate
          description="Enter the admin password to compose and send emails."
          onSuccess={() => void refetchAdmin()}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 w-full min-w-0 overflow-x-hidden">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center border border-violet-500/25 shrink-0">
            <Mail className="w-5 h-5 text-violet-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl premium-heading">
              {verificationMode ? "Send confirmation email" : "Compose Email"}
            </h1>
            <p className="text-xs text-slate-500">
              {verificationMode
                ? `To ${verification?.name} — text-only confirmation (no photos sent)`
                : "Admin — send via Resend"}
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {verificationMode && (
            <Link to="/admin">
              <Button variant="outline" size="sm" className="border-slate-700 text-slate-400">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to reviews
              </Button>
            </Link>
          )}
          <Button
            variant="outline"
            size="sm"
            className="border-slate-700 text-slate-400"
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </div>
      </div>

      {!defaults?.resendConfigured && (
        <p className="text-sm text-amber-400 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2 mb-6 break-words">
          RESEND_API_KEY is not set on Railway — emails cannot be delivered.
        </p>
      )}

      {defaults?.isTestSender && (
        <p className="text-sm text-amber-400 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2 mb-6 break-words whitespace-pre-line">
          {defaults.domainSetupHint}
        </p>
      )}

      {verificationMode && (
        <div className="text-sm text-violet-200/90 bg-violet-500/10 border border-violet-500/25 rounded-xl px-4 py-3 mb-6">
          Verification photos are for <strong className="text-violet-300">admin review only</strong> on{" "}
          <Link to={`/admin`} className="text-violet-400 underline hover:text-violet-300">
            /admin
          </Link>
          . They are <strong className="text-violet-300">not</strong> attached to this email.
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 w-full min-w-0">
        <div className="glass-card p-5 md:p-6 space-y-4 min-w-0">
          <h2 className="text-sm font-semibold text-violet-300 uppercase tracking-wide">Configuration</h2>

          <div className="space-y-2">
            <Label htmlFor="from" className="text-slate-300">Sender (From)</Label>
            <Input
              id="from"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder={defaults?.defaultFrom}
              className="bg-slate-900 border-slate-700 text-slate-100"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="to" className="text-slate-300">Receiver (To)</Label>
            <Input
              id="to"
              type="email"
              value={verificationMode ? verification?.email ?? "" : to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              disabled={verificationMode}
              className="bg-slate-900 border-slate-700 text-slate-100 disabled:opacity-60"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="replyTo" className="text-slate-300">Reply-To (optional)</Label>
            <Input
              id="replyTo"
              type="email"
              value={replyTo}
              onChange={(e) => setReplyTo(e.target.value)}
              className="bg-slate-900 border-slate-700 text-slate-100"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject" className="text-slate-300">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="bg-slate-900 border-slate-700 text-slate-100"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="headline" className="text-slate-300">Email headline</Label>
            <Input
              id="headline"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="bg-slate-900 border-slate-700 text-slate-100"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body" className="text-slate-300">Message body (HTML)</Label>
            <Textarea
              id="body"
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              rows={8}
              className="bg-slate-900 border-slate-700 text-slate-100 font-mono text-sm resize-y min-h-[140px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="footer" className="text-slate-300">Footer note</Label>
            <Input
              id="footer"
              value={footerNote}
              onChange={(e) => setFooterNote(e.target.value)}
              className="bg-slate-900 border-slate-700 text-slate-100"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Accent color</Label>
            <div className="flex flex-wrap gap-2">
              {ACCENT_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAccentColor(color)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    accentColor === color ? "border-white scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {!verificationMode && (
          <div className="space-y-2">
            <Label className="text-slate-300">Photo attachments</Label>
            <div className="flex flex-wrap gap-2">
              {attachmentUrls.map((url) => (
                <div key={url} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-700">
                  <img src={url.startsWith("/") ? url : `/${url}`} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setAttachmentUrls((prev) => prev.filter((u) => u !== url))}
                    className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              <label className="w-16 h-16 rounded-lg border border-dashed border-slate-600 flex items-center justify-center cursor-pointer hover:border-violet-500/50">
                {uploading ? (
                  <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                ) : (
                  <ImagePlus className="w-5 h-5 text-slate-500" />
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleAttach} disabled={uploading} />
              </label>
            </div>
          </div>
          )}

          {result && (
            <div
              className={`text-sm rounded-lg px-3 py-2 break-words whitespace-pre-line ${
                result.ok
                  ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/25"
                  : "text-red-400 bg-red-500/10 border border-red-500/25"
              }`}
            >
              {result.ok && <CheckCircle2 className="w-4 h-4 inline mr-1.5 -mt-0.5" />}
              {result.message}
            </div>
          )}

          {verificationMode && (
            <Button
              type="button"
              variant="outline"
              className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
              disabled={deleteMutation.isPending}
              onClick={handleDeleteSubmission}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete submission (do not send email)
            </Button>
          )}

          <Button
            onClick={handleSend}
            disabled={isSending || uploading || deleteMutation.isPending}
            className="w-full btn-glow font-semibold"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {verificationMode ? "Send confirmation email" : "Send email"}
              </>
            )}
          </Button>
        </div>

        <div className="glass-card p-5 md:p-6 min-w-0 overflow-hidden">
          <h2 className="text-sm font-semibold text-violet-300 uppercase tracking-widest mb-4">Live preview</h2>
          <div className="email-preview-frame">
            <div
              className="max-w-full overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
