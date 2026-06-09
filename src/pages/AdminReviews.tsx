import { useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import AdminLoginGate from "@/components/AdminLoginGate";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  LogOut,
  Mail,
  Shield,
  User,
} from "lucide-react";

const FILTERS = [
  { key: "pending_review" as const, label: "Awaiting email" },
  { key: "approved" as const, label: "Confirmed" },
  { key: "all" as const, label: "All" },
];

export default function AdminReviews() {
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState<"pending_review" | "approved" | "all">("pending_review");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: adminStatus, isLoading: adminLoading, refetch: refetchAdmin } =
    trpc.admin.status.useQuery();

  const { data: submissions, isLoading: listLoading } = trpc.verification.listForAdmin.useQuery(
    { status: filter },
    { enabled: !!adminStatus?.isAdmin, refetchInterval: 15000 },
  );

  const { data: selected } = trpc.verification.getForAdmin.useQuery(
    { id: selectedId ?? 0 },
    { enabled: !!adminStatus?.isAdmin && !!selectedId },
  );

  const logoutMutation = trpc.admin.logout.useMutation({
    onSuccess: () => void utils.admin.status.invalidate(),
  });

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
          title="Admin login"
          description="Sign in to review verifications and send confirmation emails."
          onSuccess={() => void refetchAdmin()}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 w-full min-w-0 overflow-x-hidden">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center border border-violet-500/25 shrink-0">
            <Shield className="w-5 h-5 text-violet-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-100">Verification reviews</h1>
            <p className="text-xs text-slate-500">
              Review submissions and send confirmation emails when ready
            </p>
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

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => {
              setFilter(f.key);
              setSelectedId(null);
            }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                : "text-slate-400 border border-slate-700/60 hover:text-slate-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 glass-card p-4 min-w-0">
          <h2 className="text-sm font-semibold text-violet-300 uppercase tracking-wide mb-4">
            Submissions
          </h2>
          {listLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
            </div>
          ) : !submissions?.length ? (
            <p className="text-sm text-slate-500 text-center py-12">No submissions in this view.</p>
          ) : (
            <ul className="space-y-2 max-h-[32rem] overflow-y-auto">
              {submissions.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(row.id)}
                    className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${
                      selectedId === row.id
                        ? "border-violet-500/40 bg-violet-500/10"
                        : "border-slate-700/60 bg-slate-900/40 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-100 truncate">{row.name}</p>
                        <p className="text-xs text-slate-500 truncate">{row.email}</p>
                      </div>
                      {row.status === "approved" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Submitted {new Date(row.createdAt).toLocaleDateString()}
                      {row.confirmationSentAt &&
                        ` · Email sent ${new Date(row.confirmationSentAt).toLocaleDateString()}`}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:col-span-3 glass-card p-5 md:p-6 min-w-0">
          {!selectedId || !selected ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
              <User className="w-10 h-10 text-slate-600 mb-3" />
              <p className="text-sm">Select a submission to review photos and send email.</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">{selected.name}</h2>
                <p className="text-sm text-slate-400">{selected.email}</p>
                <p className="text-xs text-slate-500 mt-1 capitalize">
                  Status: {selected.status.replace("_", " ")}
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3">
                  <p className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    Live verification
                  </p>
                  {selected.livenessImageUrl ? (
                    <img
                      src={selected.livenessImageUrl}
                      alt="Live verification"
                      className="w-full rounded-lg border border-slate-700 object-cover max-h-48"
                    />
                  ) : (
                    <p className="text-xs text-slate-600 py-8 text-center">No photo</p>
                  )}
                </div>
                <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3">
                  <p className="text-xs font-medium text-slate-400 mb-2">ID document</p>
                  {selected.idImageUrl ? (
                    <img
                      src={selected.idImageUrl}
                      alt="ID document"
                      className="w-full rounded-lg border border-slate-700 object-cover max-h-48"
                    />
                  ) : (
                    <p className="text-xs text-slate-600 py-8 text-center">No photo</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                <p className="text-xs text-emerald-300 leading-relaxed">
                  When you are ready, compose a confirmation email for this person. Their
                  verification photos will be embedded automatically. You control the message,
                  subject, and any extra attachments.
                </p>
              </div>

              <Link to={`/compose?verificationId=${selected.id}`}>
                <Button className="w-full btn-glow font-semibold">
                  <Mail className="w-4 h-4 mr-2" />
                  Compose & send confirmation email
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
