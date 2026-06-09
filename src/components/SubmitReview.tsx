import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Send,
  CheckCircle2,
  ShieldCheck,
  FileCheck,
  Eye,
  CreditCard,
  Mail,
  AlertCircle,
} from "lucide-react";

interface SubmitReviewProps {
  verificationId: number;
  name: string;
  email: string;
  onComplete: () => void;
}

export default function SubmitReview({ verificationId, name, email, onComplete }: SubmitReviewProps) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const submitMutation = trpc.verification.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setError("");
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = () => {
    setError("");
    submitMutation.mutate({ id: verificationId });
  };

  if (submitted) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-4 py-6 animate-in fade-in zoom-in duration-500">
          <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center border border-green-500/30">
            <ShieldCheck className="w-8 h-8 text-green-400" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-slate-100">Submission Received</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-sm">
              Your verification has been submitted for review.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">Successfully Submitted</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Your documents are now under review.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">What happens next</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Our team will review your verification. You will be contacted at{" "}
                <span className="text-sky-400 font-medium">{email}</span> once your identity
                has been confirmed.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <FileCheck className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">Under Review</p>
              <p className="text-xs text-slate-400 mt-0.5">
                This typically takes 1–2 business days.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <Button onClick={onComplete} className="bg-sky-500 hover:bg-sky-600 text-white px-8">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center mx-auto border border-sky-500/20">
          <FileCheck className="w-6 h-6 text-sky-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-100">Review & Submit</h3>
        <p className="text-sm text-slate-400">Review your information before submitting</p>
      </div>

      <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 divide-y divide-slate-700/40">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-200">Liveness Check</p>
            <p className="text-xs text-slate-500">Blink, head pose, and hold challenges passed</p>
          </div>
          <Eye className="w-4 h-4 text-slate-600" />
        </div>

        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-200">ID Document</p>
            <p className="text-xs text-slate-500">Document uploaded and linked</p>
          </div>
          <CreditCard className="w-4 h-4 text-slate-600" />
        </div>

        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
            <Mail className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-200">Contact email</p>
            <p className="text-xs text-slate-500">{email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
            <Send className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-200">Applicant</p>
            <p className="text-xs text-slate-500">{name}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 rounded-lg px-4 py-3 border border-red-500/20">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex justify-center">
        <Button
          onClick={handleSubmit}
          disabled={submitMutation.isPending}
          className="bg-sky-500 hover:bg-sky-600 text-white px-10"
          size="lg"
        >
          {submitMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          {submitMutation.isPending ? "Submitting..." : "Submit for Review"}
        </Button>
      </div>
    </div>
  );
}
