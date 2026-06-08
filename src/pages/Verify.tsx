import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Loader2, Shield, CheckCircle2 } from "lucide-react";
import IdUpload from "@/components/IdUpload";
import SubmitReview from "@/components/SubmitReview";

const LivenessCheck = lazy(() => import("@/components/LivenessCheck"));

export default function Verify() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [verificationId, setVerificationId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const utils = trpc.useUtils();

  useEffect(() => {
    const id = localStorage.getItem("verificationId");
    if (!id) {
      navigate("/start");
      return;
    }
    setVerificationId(Number(id));
    setLoading(false);
  }, [navigate]);

  const { data: verification } = trpc.verification.getById.useQuery(
    { id: verificationId ?? 0 },
    { enabled: !!verificationId, refetchInterval: 5000 }
  );

  useEffect(() => {
    if (verification) {
      if (verification.status === "pending_review" || verification.status === "approved") {
        setStep(4);
      } else if (verification.livenessVerified && verification.idVerified) {
        setStep(3);
      } else if (verification.livenessVerified && !verification.idVerified) {
        setStep(2);
      }
    }
  }, [verification]);

  const updateLiveness = trpc.verification.updateLiveness.useMutation({
    onSuccess: () => {
      utils.verification.getById.invalidate({ id: verificationId ?? 0 });
      setStep(2);
    },
  });

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!verificationId) return null;

  const steps = [
    { num: 1, label: "Liveness Check" },
    { num: 2, label: "ID Document" },
    { num: 3, label: "Review & Submit" },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-6 h-6 text-sky-400" />
          <h1 className="text-xl font-semibold text-slate-100">Identity Verification</h1>
        </div>
        <p className="text-sm text-slate-400 mb-6">3 quick steps — under 5 minutes</p>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-6">
          {steps.map((s, idx) => (
            <div key={s.num} className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                  step >= s.num
                    ? "border-sky-500 bg-sky-500/10 text-sky-400"
                    : "border-slate-700 bg-slate-900 text-slate-500"
                }`}
              >
                {step > s.num ? <CheckCircle2 className="w-5 h-5" /> : s.num}
              </div>
              {idx < steps.length - 1 && (
                <div className={`w-12 h-0.5 rounded ${step > s.num ? "bg-sky-500" : "bg-slate-800"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-sky-500 transition-all duration-500" style={{ width: `${((step - 1) / 3) * 100}%` }} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 md:p-8">
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-sky-400">Step 1:</span>
              <span className="text-sm font-semibold text-slate-100">Liveness Check</span>
            </div>
            <Suspense
              fallback={
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
                  <p className="text-sm">Loading liveness module...</p>
                </div>
              }
            >
              <LivenessCheck
                onComplete={(snapshotUrl) => {
                  updateLiveness.mutate({
                    id: verificationId,
                    imageUrl: snapshotUrl,
                  });
                }}
              />
            </Suspense>
            <div className="flex justify-start pt-4 border-t border-slate-800">
              <Button variant="ghost" className="text-slate-400 hover:text-slate-100" onClick={() => navigate("/start")}>
                <ArrowLeft className="w-4 h-4 mr-2" />Back
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-sky-400">Step 2:</span>
              <span className="text-sm font-semibold text-slate-100">ID Document</span>
            </div>
            <IdUpload
              verificationId={verificationId}
              onComplete={() => {
                utils.verification.getById.invalidate({ id: verificationId });
                setStep(3);
              }}
            />
            <div className="flex justify-start pt-4 border-t border-slate-800">
              <Button variant="ghost" className="text-slate-400 hover:text-slate-100" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />Back
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-sky-400">Step 3:</span>
              <span className="text-sm font-semibold text-slate-100">Review & Submit</span>
            </div>
            <SubmitReview
              verificationId={verificationId}
              name={verification?.name || ""}
              email={verification?.email || ""}
              onComplete={() => {
                utils.verification.getById.invalidate({ id: verificationId });
                setStep(4);
              }}
            />
            <div className="flex justify-start pt-4 border-t border-slate-800">
              <Button variant="ghost" className="text-slate-400 hover:text-slate-100" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-2" />Back
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="text-center space-y-6 py-8">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-100 mb-2">Submitted for Review</h3>
              <p className="text-slate-400 max-w-sm mx-auto">
                Your verification has been submitted. You will receive a confirmation email once your ID is verified.
              </p>
            </div>
            <Button className="bg-sky-500 hover:bg-sky-600 text-white" onClick={() => navigate("/dashboard")}>
              Go to Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
