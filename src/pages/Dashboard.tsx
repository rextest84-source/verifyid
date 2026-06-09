import { useEffect, useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import {
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  Eye,
  CreditCard,
  FileCheck,
  ArrowRight,
  AlertCircle,
  Sparkles,
} from "lucide-react";

export default function Dashboard() {
  const [verificationId, setVerificationId] = useState<number | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("verificationId");
    const n = localStorage.getItem("verificationName");
    if (id) setVerificationId(Number(id));
    if (n) setName(n);
  }, []);

  const { data: verification } = trpc.verification.getById.useQuery(
    { id: verificationId ?? 0 },
    { enabled: !!verificationId, refetchInterval: 5000 },
  );

  if (!verificationId) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
        <div className="max-w-sm w-full glass-card p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 flex items-center justify-center mx-auto border border-violet-500/25">
            <Shield className="w-7 h-7 text-violet-400" />
          </div>
          <div>
            <h2 className="text-xl premium-heading text-slate-100">No verification found</h2>
            <p className="text-slate-400 text-sm mt-2">
              Start a new identity verification to track your progress here.
            </p>
          </div>
          <Link to="/start">
            <Button className="w-full btn-glow">
              Start verification
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
    in_progress: { label: "In Progress", color: "text-amber-400", icon: Clock },
    pending_review: { label: "Pending Review", color: "text-violet-400", icon: FileCheck },
    approved: { label: "Approved", color: "text-emerald-400", icon: CheckCircle2 },
    rejected: { label: "Rejected", color: "text-red-400", icon: AlertCircle },
  };

  const currentStatus = statusConfig[verification?.status || "in_progress"];
  const StatusIcon = currentStatus.icon;

  const steps = [
    {
      key: "liveness",
      label: "Liveness Check",
      icon: Eye,
      done: !!verification?.livenessVerified,
      time: verification?.livenessVerified,
    },
    {
      key: "id",
      label: "ID Document",
      icon: CreditCard,
      done: !!verification?.idVerified,
      time: verification?.idVerified,
    },
    {
      key: "submit",
      label: "Submitted for Review",
      icon: FileCheck,
      done:
        verification?.status === "pending_review" ||
        verification?.status === "approved" ||
        !!verification?.confirmationSentAt,
      time: null,
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const percent = Math.round((completed / steps.length) * 100);
  const isSubmitted =
    verification?.status === "pending_review" ||
    verification?.status === "approved" ||
    !!verification?.confirmationSentAt;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 w-full min-w-0 overflow-x-hidden">
      <div className="mb-8">
        <div className="premium-badge mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          Your verification hub
        </div>
        <h2 className="text-sm text-slate-500 mb-1">Welcome back,</h2>
        <h1 className="text-2xl md:text-3xl premium-heading">{name || "User"}</h1>
        <p className="text-slate-400 text-sm mt-2">Track status and continue where you left off</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <div className="glass-card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Status</p>
          <div className={`text-lg font-semibold flex items-center gap-2 ${currentStatus.color}`}>
            <StatusIcon className="w-5 h-5" />
            {currentStatus.label}
          </div>
        </div>
        <div className="glass-card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Progress</p>
          <div className="text-lg font-semibold text-slate-100">{percent}%</div>
          <div className="mt-3 h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
        <div className="glass-card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Steps</p>
          <div className="text-lg font-semibold text-slate-100">
            {completed} / {steps.length}
          </div>
        </div>
      </div>

      <div className="glass-card p-6 mb-8">
        <h3 className="text-base font-semibold text-slate-100 mb-4">Verification steps</h3>
        <div className="space-y-3">
          {steps.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between rounded-xl border border-violet-500/10 bg-slate-950/40 px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    s.done ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" : "bg-slate-800/80 text-slate-500"
                  }`}
                >
                  <s.icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-200">{s.label}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {s.done
                      ? s.time
                        ? `Completed ${new Date(s.time).toLocaleDateString()}`
                        : "Completed"
                      : "Not started"}
                  </p>
                </div>
              </div>
              {s.done ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-slate-600 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {verification?.status === "approved" && (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/8 px-5 py-4 mb-8 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-emerald-300">Identity confirmed</p>
            <p className="text-xs text-slate-400 mt-1">
              Your identity verification is complete.
              {verification.confirmationSentAt &&
                ` Confirmation was sent on ${new Date(verification.confirmationSentAt).toLocaleDateString()}.`}
            </p>
          </div>
        </div>
      )}

      {verification?.status === "pending_review" && (
        <div className="rounded-2xl border border-violet-500/25 bg-violet-500/8 px-5 py-4 mb-8 flex items-start gap-3">
          <Clock className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-violet-300">Under review</p>
            <p className="text-xs text-slate-400 mt-1">
              Your documents are being reviewed. Our team will contact you at {verification?.email} once your identity has been confirmed.
            </p>
          </div>
        </div>
      )}

      {!isSubmitted && (
        <div className="flex justify-center mb-8">
          <Link to="/verify">
            <Button className="btn-glow px-8">
              Continue verification
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass-card p-5 text-center">
          <Activity className="w-5 h-5 text-violet-400 mx-auto mb-2" />
          <p className="text-xs text-slate-500 uppercase tracking-wider">Score</p>
          <p className="text-lg font-semibold text-slate-100 mt-1">{percent}%</p>
        </div>
        <div className="glass-card p-5 text-center">
          <StatusIcon className="w-5 h-5 text-violet-400 mx-auto mb-2" />
          <p className="text-xs text-slate-500 uppercase tracking-wider">Status</p>
          <p className="text-lg font-semibold text-slate-100 mt-1">{currentStatus.label}</p>
        </div>
        <div className="glass-card p-5 text-center">
          <Shield className="w-5 h-5 text-violet-400 mx-auto mb-2" />
          <p className="text-xs text-slate-500 uppercase tracking-wider">Started</p>
          <p className="text-lg font-semibold text-slate-100 mt-1">
            {verification?.createdAt ? new Date(verification.createdAt).toLocaleDateString() : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
