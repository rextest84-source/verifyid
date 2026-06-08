import { lazy, Suspense, useEffect, useRef, useState } from "react";
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
  const [livenessSessionKey, setLivenessSessionKey] = useState(0);
  const [idUploadKey, setIdUploadKey] = useState(0);
  const initialStepSynced = useRef(false);

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

  // Sync step from server only on first load — don't override manual Back navigation.
  useEffect(() => {
    if (!verification || initialStepSynced.current) return;
    initialStepSynced.current = true;

    if (verification.status === "pending_review" || verification.status === "approved") {
      setStep(4);
    } else if (verification.livenessVerified && verification.idVerified) {
      setStep(3);
    } else if (verification.livenessVerified && !verification.idVerified) {
      setStep(2);
    } else {
      setStep(1);
    }
  }, [verification]);

  const updateLiveness = trpc.verification.updateLiveness.useMutation({
    onSuccess: () => {
      utils.verification.getById.invalidate({ id: verificationId ?? 0 });
      setStep(2);
    },
  });

  const resetLiveness = trpc.verification.resetLiveness.useMutation({
    onSuccess: () => {
      utils.verification.getById.invalidate({ id: verificationId ?? 0 });
    },
  });

  const resetIdDocument = trpc.verification.resetIdDocument.useMutation({
    onSuccess: () => {
      utils.verification.getById.invalidate({ id: verificationId ?? 0 });
    },
  });

  const handleBackToLiveness = async () => {
    if (!verificationId) return;
    await resetLiveness.mutateAsync({ id: verificationId });
    setLivenessSessionKey((k) => k + 1);
    setStep(1);
  };

  const handleBackToIdUpload = async () => {
    if (!verificationId) return;
    await resetIdDocument.mutateAsync({ id: verificationId });
    setIdUploadKey((k) => k + 1);
    setStep(2);
  };

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

  const redoingLiveness = resetLiveness.isPending;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center border border-violet-500/25">
            <Shield className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Identity Verification</h1>
            <p className="text-xs text-slate-500">3 quick steps — under 5 minutes</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 mb-6 mt-6">
          {steps.map((s, idx) => (
            <div key={s.num} className="flex items-center gap-2 sm:gap-3 flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5 min-w-0">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${
                    step >= s.num
                      ? "border-violet-500 bg-violet-500/15 text-violet-300 shadow-sm shadow-violet-500/20"
                      : "border-slate-700 bg-slate-900/80 text-slate-500"
                  }`}
                >
                  {step > s.num ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : s.num}
                </div>
                <span className="text-[10px] text-slate-500 font-medium hidden sm:block truncate max-w-[5rem]">
                  {s.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 rounded-full transition-colors duration-500 ${
                    step > s.num ? "bg-gradient-to-r from-violet-500 to-fuchsia-500" : "bg-slate-800"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="h-1.5 bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-all duration-500 ease-out"
            style={{ width: `${((step - 1) / 3) * 100}%` }}
          />
        </div>
      </div>

      <div className="glass-card p-6 md:p-8">
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-violet-400">Step 1:</span>
              <span className="text-sm font-semibold text-slate-100">Liveness Check</span>
            </div>
            <Suspense
              fallback={
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
                  <p className="text-sm">Loading liveness module...</p>
                </div>
              }
            >
              <LivenessCheck
                key={livenessSessionKey}
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
              <span className="text-sm font-medium text-violet-400">Step 2:</span>
              <span className="text-sm font-semibold text-slate-100">ID Document</span>
            </div>
            <IdUpload
              key={idUploadKey}
              verificationId={verificationId}
              onComplete={() => {
                utils.verification.getById.invalidate({ id: verificationId });
                setStep(3);
              }}
            />
            <div className="flex justify-start pt-4 border-t border-slate-800">
              <Button
                variant="ghost"
                className="text-slate-400 hover:text-slate-100"
                onClick={() => void handleBackToLiveness()}
                disabled={redoingLiveness}
              >
                {redoingLiveness ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ArrowLeft className="w-4 h-4 mr-2" />
                )}
                Back
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-violet-400">Step 3:</span>
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
              <Button
                variant="ghost"
                className="text-slate-400 hover:text-slate-100"
                onClick={() => void handleBackToIdUpload()}
                disabled={resetIdDocument.isPending}
              >
                {resetIdDocument.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ArrowLeft className="w-4 h-4 mr-2" />
                )}
                Back
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
            <Button className="bg-violet-500 hover:bg-violet-600 text-white" onClick={() => navigate("/dashboard")}>
              Go to Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
