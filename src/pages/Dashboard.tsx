import { useEffect, useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, CheckCircle2, XCircle, Clock, Activity, Eye, CreditCard, FileCheck, ArrowRight, AlertCircle } from "lucide-react";

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
    { enabled: !!verificationId, refetchInterval: 5000 }
  );

  if (!verificationId) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
        <Card className="max-w-sm w-full border-slate-800 bg-slate-900/50">
          <CardHeader className="text-center">
            <Shield className="w-10 h-10 text-sky-400 mx-auto mb-2" />
            <CardTitle className="text-slate-100">No Verification Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-slate-400 text-sm">Start a new identity verification to see your progress here.</p>
            <Link to="/start">
              <Button className="bg-sky-500 hover:bg-sky-600 text-white w-full">
                Start Verification <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
    in_progress: { label: "In Progress", color: "text-amber-400", icon: Clock },
    pending_review: { label: "Pending Review", color: "text-sky-400", icon: FileCheck },
    approved: { label: "Approved", color: "text-green-400", icon: CheckCircle2 },
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
      done: verification?.status === "pending_review" || verification?.status === "approved",
      time: null,
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const percent = Math.round((completed / steps.length) * 100);
  const isSubmitted = verification?.status === "pending_review" || verification?.status === "approved";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-sm text-slate-400 mb-1">Welcome back,</h2>
        <h1 className="text-2xl font-bold text-slate-100">{name || "User"}</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your verification status</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-400 uppercase">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-lg font-semibold flex items-center gap-2 ${currentStatus.color}`}>
              <StatusIcon className="w-5 h-5" />
              {currentStatus.label}
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-400 uppercase">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold text-slate-100">{percent}%</div>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-400 uppercase">Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold text-slate-100">{completed} / {steps.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-800 bg-slate-900/50 mb-8">
        <CardHeader>
          <CardTitle className="text-slate-100 text-base">Verification Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {steps.map((s) => (
            <div key={s.key} className="flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-950/50 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.done ? "bg-green-500/10 text-green-400" : "bg-slate-800 text-slate-500"}`}>
                  <s.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">{s.label}</p>
                  <p className="text-xs text-slate-500">
                    {s.done ? (s.time ? `Completed ${new Date(s.time).toLocaleDateString()}` : "Completed") : "Not started"}
                  </p>
                </div>
              </div>
              {s.done ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <XCircle className="w-5 h-5 text-slate-600" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {verification?.status === "pending_review" && (
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-5 py-4 mb-8 flex items-start gap-3">
          <Clock className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-sky-300">Under Review</p>
            <p className="text-xs text-slate-400 mt-1">
              Your documents are being reviewed. You will receive a confirmation email at {verification?.email} once the verification is complete.
            </p>
          </div>
        </div>
      )}

      {!isSubmitted && (
        <div className="flex justify-center">
          <Link to="/verify">
            <Button className="bg-sky-500 hover:bg-sky-600 text-white">
              Continue Verification <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="pt-6 text-center">
            <Activity className="w-5 h-5 text-sky-400 mx-auto mb-2" />
            <p className="text-xs text-slate-400">Score</p>
            <p className="text-lg font-semibold text-slate-100">{percent}%</p>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="pt-6 text-center">
            <StatusIcon className="w-5 h-5 text-sky-400 mx-auto mb-2" />
            <p className="text-xs text-slate-400">Status</p>
            <p className="text-lg font-semibold text-slate-100">{currentStatus.label}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="pt-6 text-center">
            <Shield className="w-5 h-5 text-sky-400 mx-auto mb-2" />
            <p className="text-xs text-slate-400">Submitted</p>
            <p className="text-lg font-semibold text-slate-100">
              {verification?.createdAt ? new Date(verification.createdAt).toLocaleDateString() : "—"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
