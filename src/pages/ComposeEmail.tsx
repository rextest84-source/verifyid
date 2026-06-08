import { useMemo, useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { uploadImageFile } from "@/lib/upload";
import {
  CheckCircle2,
  ImagePlus,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Send,
  X,
} from "lucide-react";

const ACCENT_PRESETS = ["#8b5cf6", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#6366f1"] as const;

function buildPreviewHtml(
  headline: string,
  body: string,
  footer: string,
  accent: string,
  imageUrls: string[],
): string {
  const imgs = imageUrls
    .map(
      (url) =>
        `<div style="margin-top:16px;"><img src="${url}" alt="attachment" style="max-width:100%;border-radius:12px;border:1px solid #e2e8f0;" /></div>`,
    )
    .join("");

  return `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;background:#f8fafc;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:linear-gradient(135deg,${accent},#7c3aed);padding:24px;text-align:center;">
      <h2 style="margin:0;color:#fff;font-size:20px;">${headline || "Your headline"}</h2>
    </div>
    <div style="background:#fff;padding:24px;color:#334155;font-size:14px;line-height:1.6;">
      ${body || "<p>Your message appears here.</p>"}
      ${imgs}
    </div>
    <div style="background:#f1f5f9;padding:16px;text-align:center;font-size:12px;color:#64748b;">
      ${footer || "Sent via VerifyID"}
    </div>
  </div>`;
}

function AdminLoginGate({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const loginMutation = trpc.admin.login.useMutation({
    onSuccess: () => {
      setError("");
      onSuccess();
    },
    onError: (err) => setError(err.message),
  });

  return (
    <div className="max-w-sm mx-auto glass-card p-8 space-y-5">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-violet-500/15 flex items-center justify-center mx-auto border border-violet-500/25">
          <Lock className="w-7 h-7 text-violet-400" />
        </div>
        <h1 className="text-xl font-bold text-slate-100">Admin only</h1>
        <p className="text-sm text-slate-400">
          Enter the admin password to access the email composer.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="admin-password" className="text-slate-300">Admin password</Label>
        <Input
          id="admin-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-slate-900 border-slate-700 text-slate-100"
          onKeyDown={(e) => e.key === "Enter" && loginMutation.mutate({ password })}
        />
      </div>
      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2 break-words">{error}</p>
      )}
      <Button
        className="w-full btn-glow"
        disabled={!password || loginMutation.isPending}
        onClick={() => loginMutation.mutate({ password })}
      >
        {loginMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Unlock"}
      </Button>
    </div>
  );
}

export default function ComposeEmail() {
  const utils = trpc.useUtils();
  const { data: adminStatus, isLoading: adminLoading, refetch: refetchAdmin } =
    trpc.admin.status.useQuery();

  const { data: defaults } = trpc.email.getDefaults.useQuery(undefined, {
    enabled: !!adminStatus?.isAdmin,
  });

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

  const effectiveFrom = from || defaults?.defaultFrom || "VerifyID <onboarding@resend.dev>";

  const sendMutation = trpc.email.sendCustom.useMutation({
    onSuccess: (data) => {
      if (data.sent && data.id) {
        setResult({ ok: true, message: `Email delivered (Resend ID: ${data.id})` });
      } else if (data.sent) {
        setResult({ ok: true, message: "Email accepted by Resend" });
      } else {
        setResult({
          ok: false,
          message: data.error || "Email could not be sent. Check sender domain in Resend.",
        });
      }
    },
    onError: (err) => {
      setResult({ ok: false, message: err.message });
    },
  });

  const previewHtml = useMemo(
    () => buildPreviewHtml(headline, bodyHtml, footerNote, accentColor, attachmentUrls),
    [headline, bodyHtml, footerNote, accentColor, attachmentUrls],
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
    if (!to.trim() || !subject.trim() || !headline.trim() || !bodyHtml.trim()) {
      setResult({ ok: false, message: "Please fill in receiver, subject, headline, and body." });
      return;
    }

    sendMutation.mutate({
      from: effectiveFrom,
      to: to.trim(),
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
        <AdminLoginGate onSuccess={() => void refetchAdmin()} />
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
            <h1 className="text-xl font-bold text-slate-100">Compose Email</h1>
            <p className="text-xs text-slate-500">Admin — send via Resend</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-slate-700 text-slate-400 shrink-0"
          onClick={() => logoutMutation.mutate()}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </Button>
      </div>

      {!defaults?.resendConfigured && (
        <p className="text-sm text-amber-400 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2 mb-6 break-words">
          RESEND_API_KEY is not set on Railway — emails cannot be delivered.
        </p>
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
            <p className="text-[11px] text-slate-500 break-words">
              Must be verified in Resend. Default: {defaults?.defaultFrom}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="to" className="text-slate-300">Receiver (To)</Label>
            <Input
              id="to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="bg-slate-900 border-slate-700 text-slate-100"
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

          <div className="space-y-2">
            <Label className="text-slate-300">Photo attachments</Label>
            <div className="flex flex-wrap gap-2">
              {attachmentUrls.map((url, i) => (
                <div key={url} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-700">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setAttachmentUrls((prev) => prev.filter((_, idx) => idx !== i))}
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

          {result && (
            <div
              className={`text-sm rounded-lg px-3 py-2 break-words ${
                result.ok
                  ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/25"
                  : "text-red-400 bg-red-500/10 border border-red-500/25"
              }`}
            >
              {result.ok && <CheckCircle2 className="w-4 h-4 inline mr-1.5 -mt-0.5" />}
              {result.message}
            </div>
          )}

          <Button
            onClick={handleSend}
            disabled={sendMutation.isPending || uploading}
            className="w-full btn-glow font-semibold"
          >
            {sendMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send email
              </>
            )}
          </Button>
        </div>

        <div className="glass-card p-5 md:p-6 min-w-0 overflow-hidden">
          <h2 className="text-sm font-semibold text-violet-300 uppercase tracking-wide mb-4">Live preview</h2>
          <div
            className="bg-white rounded-xl overflow-hidden max-w-full overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      </div>
    </div>
  );
}
