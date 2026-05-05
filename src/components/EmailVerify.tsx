import { useState, useRef, useCallback } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, CheckCircle2, Send, RefreshCw, ShieldCheck, AlertTriangle } from "lucide-react";

interface EmailVerifyProps {
  verificationId: number;
  email: string;
  onComplete: () => void;
}

export default function EmailVerify({ verificationId, email, onComplete }: EmailVerifyProps) {
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [sent, setSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const sendCodeMutation = trpc.verification.sendEmailCode.useMutation({
    onSuccess: (data) => {
      setSent(true);
      setError("");
      if (data.code) {
        setMessage(data.message);
      } else {
        setMessage(`A verification code has been sent to ${email}`);
      }
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const verifyCodeMutation = trpc.verification.verifyEmailCode.useMutation({
    onSuccess: () => {
      setVerified(true);
      setError("");
      onComplete();
    },
    onError: (err) => {
      setError(err.message);
      setCode(["", "", "", "", "", ""]);
    },
  });

  const handleSend = () => {
    setMessage("");
    setError("");
    sendCodeMutation.mutate({ id: verificationId });
  };

  const handleVerify = () => {
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }
    setError("");
    verifyCodeMutation.mutate({ id: verificationId, code: fullCode });
  };

  const handleChange = useCallback((idx: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...code];
    next[idx] = value;
    setCode(next);
    if (value && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  }, [code]);

  const handleKeyDown = useCallback((idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  }, [code]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = [...code];
    for (let i = 0; i < pasted.length; i++) {
      if (i < 6) next[i] = pasted[i];
    }
    setCode(next);
    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
  }, [code]);

  return (
    <div className="space-y-6">
      {verified ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center border border-green-500/30">
            <ShieldCheck className="w-7 h-7 text-green-400" />
          </div>
          <h4 className="text-lg font-semibold text-slate-100">Email Verified</h4>
          <p className="text-sm text-slate-400 text-center">{email} has been successfully verified.</p>
        </div>
      ) : !sent ? (
        /* Step 1: Send Code */
        <div className="space-y-6">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center mx-auto border border-sky-500/20">
              <Mail className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Verify Your Email</h3>
              <p className="text-sm text-slate-400 mt-1">We will send a one-time verification code to:</p>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <Mail className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-200">{email}</span>
            </div>
          </div>

          {message && (
            <div className="text-center text-sm text-amber-400 bg-amber-500/10 rounded-xl px-4 py-3 border border-amber-500/20">
              <AlertTriangle className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              {message}
            </div>
          )}

          {!message && !error && (
            <div className="text-center text-sm text-slate-500 bg-slate-800/40 rounded-xl px-4 py-3 border border-slate-700/50">
              No email service configured. The code will be shown on screen after sending.
            </div>
          )}

          {error && (
            <div className="text-center text-sm text-red-400 bg-red-500/10 rounded-xl px-4 py-3 border border-red-500/20">
              {error}
            </div>
          )}

          <div className="flex justify-center">
            <Button
              onClick={handleSend}
              disabled={sendCodeMutation.isPending}
              className="bg-sky-500 hover:bg-sky-600 text-white px-8"
              size="lg"
            >
              {sendCodeMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send Verification Code
            </Button>
          </div>
        </div>
      ) : (
        /* Step 2: Enter Code */
        <div className="space-y-6">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto border border-green-500/20">
              <CheckCircle2 className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Enter Verification Code</h3>
              <p className="text-sm text-slate-400 mt-1">We sent a 6-digit code to</p>
              <p className="text-sm font-semibold text-sky-400 mt-0.5">{email}</p>
            </div>
          </div>

          {/* 6-digit code input — bulletproof, no library dependencies */}
          <div className="flex justify-center gap-2.5">
            {code.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => { inputRefs.current[idx] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={idx === 0 ? handlePaste : undefined}
                className="w-12 h-14 rounded-xl bg-slate-800/80 border border-slate-600 text-slate-100 text-xl font-bold text-center outline-none transition-all focus:border-sky-500 focus:ring-1 focus:ring-sky-500/50 caret-sky-400"
                autoFocus={idx === 0}
              />
            ))}
          </div>

          {error && (
            <div className="text-center text-sm text-red-400 bg-red-500/10 rounded-xl px-4 py-3 border border-red-500/20">
              {error}
            </div>
          )}

          <div className="flex flex-col items-center gap-3">
            <div className="flex justify-center gap-3">
              <Button
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                onClick={handleSend}
                disabled={sendCodeMutation.isPending}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${sendCodeMutation.isPending ? "animate-spin" : ""}`} />
                Resend
              </Button>
              <Button
                onClick={handleVerify}
                disabled={verifyCodeMutation.isPending || code.join("").length !== 6}
                className="bg-sky-500 hover:bg-sky-600 text-white px-6"
              >
                {verifyCodeMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4 mr-2" />
                )}
                Verify Code
              </Button>
            </div>
            <button
              onClick={() => { setSent(false); setCode(["", "", "", "", "", ""]); setError(""); setMessage(""); }}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Use a different email
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
