import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import AdminLoginGate from "@/components/AdminLoginGate";
import ImageLightbox from "@/components/ImageLightbox";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  Expand,
  Eye,
  Loader2,
  LogOut,
  Mail,
  Shield,
  Trash2,
  User,
} from "lucide-react";

const FILTERS = [
  { key: "pending_review" as const, label: "Awaiting email" },
  { key: "approved" as const, label: "Confirmed" },
  { key: "all" as const, label: "All" },
];

type LightboxState = { src: string; label: string } | null;

export default function AdminReviews() {
  const utils = trpc.useUtils();
  const detailRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<"pending_review" | "approved" | "all">("pending_review");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [lightbox, setLightbox] = useState<LightboxState>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: adminStatus, isLoading: adminLoading, refetch: refetchAdmin } =
    trpc.admin.status.useQuery();

  const { data: submissions, isLoading: listLoading } = trpc.verification.listForAdmin.useQuery(
    { status: filter },
    { enabled: !!adminStatus?.isAdmin, refetchInterval: 15000 },
  );

  const {
    data: selected,
    isLoading: selectedLoading,
    isError: selectedError,
  } = trpc.verification.getForAdmin.useQuery(
    { id: selectedId ?? 0 },
    { enabled: !!adminStatus?.isAdmin && !!selectedId },
  );

  const logoutMutation = trpc.admin.logout.useMutation({
    onSuccess: () => void utils.admin.status.invalidate(),
  });

  const deleteMutation = trpc.verification.deleteForAdmin.useMutation({
    onSuccess: () => {
      void utils.verification.listForAdmin.invalidate();
      setSelectedId(null);
      setMobileDetail(false);
      setDeletingId(null);
    },
    onError: () => setDeletingId(null),
  });

  const selectSubmission = (id: number) => {
    setSelectedId(id);
    setMobileDetail(true);
  };

  const handleDelete = (id: number, name: string) => {
    const ok = window.confirm(
      `Delete verification for "${name}"?\n\nThis removes the submission and photos permanently. No confirmation email will be sent.`,
    );
    if (!ok) return;
    setDeletingId(id);
    deleteMutation.mutate({ id });
  };

  useEffect(() => {
    if (selectedId && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedId, selected]);

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

  const showList = !mobileDetail;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 w-full min-w-0 overflow-x-hidden">
      <ImageLightbox
        src={lightbox?.src ?? ""}
        alt={lightbox?.label ?? "Verification photo"}
        label={lightbox?.label}
        open={!!lightbox}
        onClose={() => setLightbox(null)}
      />

      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center border border-violet-500/25 shrink-0">
            <Shield className="w-5 h-5 text-violet-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-100">Verification reviews</h1>
            <p className="text-xs text-slate-500">
              Review photos, delete unwanted submissions, then send email
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

      {showList && (
        <div className="flex flex-wrap gap-2 mb-6">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => {
                setFilter(f.key);
                setSelectedId(null);
                setMobileDetail(false);
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
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        <div
          className={`lg:col-span-2 glass-card p-4 min-w-0 ${mobileDetail ? "hidden lg:block" : "block"}`}
        >
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
                  <div
                    className={`rounded-xl border transition-colors ${
                      selectedId === row.id
                        ? "border-violet-500/40 bg-violet-500/10"
                        : "border-slate-700/60 bg-slate-900/40"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => selectSubmission(row.id)}
                      className="w-full text-left px-4 py-3 hover:border-slate-600"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
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
                    <div className="px-4 pb-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => selectSubmission(row.id)}
                        className="flex-1 text-xs py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800/60"
                      >
                        Review
                      </button>
                      <Link
                        to={`/compose?verificationId=${row.id}`}
                        className="flex-1 text-xs py-2 rounded-lg btn-glow text-center font-medium flex items-center justify-center gap-1"
                      >
                        <Mail className="w-3 h-3" />
                        Send
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(row.id, row.name)}
                        disabled={deletingId === row.id}
                        className="px-3 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                        aria-label={`Delete ${row.name}`}
                      >
                        {deletingId === row.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          ref={detailRef}
          className={`lg:col-span-3 glass-card p-5 md:p-6 min-w-0 ${showList && !selectedId ? "hidden lg:block" : "block"}`}
        >
          {mobileDetail && (
            <button
              type="button"
              onClick={() => setMobileDetail(false)}
              className="lg:hidden flex items-center gap-1.5 text-sm text-violet-400 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to list
            </button>
          )}

          {!selectedId ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
              <User className="w-10 h-10 text-slate-600 mb-3" />
              <p className="text-sm">Select a submission to review photos and send email.</p>
            </div>
          ) : selectedLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-violet-400 mb-3" />
              <p className="text-sm">Loading submission…</p>
            </div>
          ) : selectedError || !selected ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-red-400 mb-4">Could not load this submission.</p>
              <Link to={`/compose?verificationId=${selectedId}`}>
                <Button className="btn-glow">
                  <Mail className="w-4 h-4 mr-2" />
                  Send email anyway
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-100">{selected.name}</h2>
                  <p className="text-sm text-slate-400">{selected.email}</p>
                  <p className="text-xs text-slate-500 mt-1 capitalize">
                    Status: {selected.status.replace("_", " ")}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10 shrink-0"
                  disabled={deleteMutation.isPending}
                  onClick={() => handleDelete(selected.id, selected.name)}
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-1.5" />
                      Delete
                    </>
                  )}
                </Button>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3">
                  <p className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    Live verification
                  </p>
                  {selected.livenessImageDataUrl ? (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() =>
                          setLightbox({
                            src: selected.livenessImageDataUrl!,
                            label: "Live verification photo",
                          })
                        }
                        className="relative w-full group"
                      >
                        <img
                          src={selected.livenessImageDataUrl}
                          alt="Live verification"
                          className="w-full rounded-lg border border-slate-700 object-cover max-h-48"
                        />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity rounded-lg">
                          <Expand className="w-6 h-6 text-white" />
                        </span>
                      </button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full border-slate-700 text-slate-300 text-xs"
                        onClick={() =>
                          setLightbox({
                            src: selected.livenessImageDataUrl!,
                            label: "Live verification photo",
                          })
                        }
                      >
                        <Expand className="w-3.5 h-3.5 mr-1.5" />
                        View full image
                      </Button>
                    </div>
                  ) : selected.livenessImageUrl ? (
                    <p className="text-xs text-amber-400 py-8 text-center px-2">
                      Photo file not found on server (may have been lost after a redeploy).
                    </p>
                  ) : (
                    <p className="text-xs text-slate-600 py-8 text-center">No photo captured</p>
                  )}
                </div>
                <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3">
                  <p className="text-xs font-medium text-slate-400 mb-2">ID document</p>
                  {selected.idImageDataUrl ? (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() =>
                          setLightbox({
                            src: selected.idImageDataUrl!,
                            label: "ID document photo",
                          })
                        }
                        className="relative w-full group"
                      >
                        <img
                          src={selected.idImageDataUrl}
                          alt="ID document"
                          className="w-full rounded-lg border border-slate-700 object-cover max-h-48"
                        />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity rounded-lg">
                          <Expand className="w-6 h-6 text-white" />
                        </span>
                      </button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full border-slate-700 text-slate-300 text-xs"
                        onClick={() =>
                          setLightbox({
                            src: selected.idImageDataUrl!,
                            label: "ID document photo",
                          })
                        }
                      >
                        <Expand className="w-3.5 h-3.5 mr-1.5" />
                        View full image
                      </Button>
                    </div>
                  ) : selected.idImageUrl ? (
                    <p className="text-xs text-amber-400 py-8 text-center px-2">
                      Photo file not found on server (may have been lost after a redeploy).
                    </p>
                  ) : (
                    <p className="text-xs text-slate-600 py-8 text-center">No photo uploaded</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                <p className="text-xs text-emerald-300 leading-relaxed">
                  When ready, send a confirmation email. Delete this submission if you do not want
                  to approve it.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Link to={`/compose?verificationId=${selected.id}`} className="flex-1">
                  <Button className="w-full btn-glow font-semibold">
                    <Mail className="w-4 h-4 mr-2" />
                    Compose & send email
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  disabled={deleteMutation.isPending}
                  onClick={() => handleDelete(selected.id, selected.name)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete submission
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
