import { Button } from "@/components/ui/button";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/lib/liveness/constants";
import { useLivenessSession } from "@/lib/liveness/useLivenessSession";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Eye,
  Loader2,
  MoveHorizontal,
  ScanFace,
  Shield,
  Sparkles,
} from "lucide-react";

interface LivenessCheckProps {
  onComplete: (snapshotUrl?: string) => void;
}

const CHALLENGE_ICONS = [ScanFace, Eye, MoveHorizontal, MoveHorizontal, Shield] as const;
const CHALLENGE_LABELS = ["Align", "Blink", "Left", "Right", "Hold"];

export default function LivenessCheck({ onComplete }: LivenessCheckProps) {
  const { videoRef, canvasRef, phase, error, challenge, start, challengeCount } =
    useLivenessSession(onComplete);

  const isActive = phase === "loading" || phase === "running" || phase === "success";
  const overallProgress =
    phase === "success"
      ? 100
      : Math.round(((challenge.index + challenge.progress) / challengeCount) * 20) * 5;

  const headerTitle =
    phase === "success"
      ? "Liveness verified"
      : phase === "running"
        ? `Step ${challenge.index + 1}: ${challenge.title}`
        : phase === "loading"
          ? "Starting camera..."
          : "Quick face verification";

  return (
    <div className="space-y-5">
      <div className="text-center space-y-3 min-h-[5.5rem]">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/25 text-sky-300 text-xs font-semibold shadow-sm shadow-sky-500/10">
          <Sparkles className="w-3.5 h-3.5" />
          Guided liveness check
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-100">{headerTitle}</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto min-h-[2.5rem]">
            {phase === "idle"
              ? "Five easy steps — move at your own pace. Follow the on-screen arrows."
              : phase === "loading"
                ? "Getting things ready..."
                : phase === "running"
                  ? challenge.feedback
                  : "Complete"}
          </p>
        </div>
      </div>

      {isActive && phase !== "success" && (
        <div className="flex items-center justify-center gap-1.5 flex-wrap min-h-[2rem]">
          {Array.from({ length: challengeCount }).map((_, idx) => {
            const Icon = CHALLENGE_ICONS[idx] ?? Shield;
            const done = idx < challenge.index;
            const active = idx === challenge.index;
            return (
              <div
                key={idx}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all duration-300 ${
                  done
                    ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-400"
                    : active
                      ? "bg-sky-500/15 border-sky-500/40 text-sky-300 shadow-sm shadow-sky-500/10"
                      : "bg-slate-800/40 border-slate-700/50 text-slate-500"
                }`}
              >
                {done ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <Icon className={`w-3 h-3 ${active && phase === "running" ? "text-sky-300" : ""}`} />
                )}
                <span className="hidden sm:inline">{CHALLENGE_LABELS[idx]}</span>
              </div>
            );
          })}
        </div>
      )}

      {isActive && (
        <div className="space-y-2 max-w-sm mx-auto">
          <div className="flex justify-between text-[11px] text-slate-500 font-semibold tracking-wide uppercase">
            <span>{phase === "success" ? "Complete" : `Step ${challenge.index + 1} of ${challengeCount}`}</span>
            <span className="text-sky-400">{overallProgress}%</span>
          </div>
          <div className="h-2 bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50">
            <div
              className="h-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 rounded-xl px-4 py-3 border border-red-500/25 max-w-sm mx-auto">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 backdrop-blur px-5 py-4 max-w-sm text-center">
            <p className="text-xs text-slate-400 leading-relaxed">
              Watch for the scan line and progress ring. When it turns green,
              you&apos;re locked in — then blink and follow the left/right arrows.
            </p>
          </div>
          <Button onClick={start} className="btn-glow" size="lg">
            <Camera className="w-4 h-4 mr-2" />
            Begin Liveness Check
          </Button>
        </div>
      )}

      {phase !== "idle" && (
        <div
          className="relative rounded-2xl overflow-hidden border mx-auto max-w-sm border-sky-500/20 shadow-2xl shadow-sky-500/15 bg-slate-950 isolate [contain:layout_paint] ring-1 ring-sky-500/10"
          style={{ aspectRatio: `${CANVAS_WIDTH}/${CANVAS_HEIGHT}` }}
        >
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none -scale-x-100 [transform:translateZ(0)] [backface-visibility:hidden]"
            muted
            playsInline
            autoPlay
          />
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="absolute inset-0 w-full h-full pointer-events-none [transform:translateZ(0)] [backface-visibility:hidden]"
          />

          {phase === "loading" && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-9 h-9 text-sky-400 animate-spin" />
              <p className="text-sm text-slate-400 font-medium">Opening camera...</p>
            </div>
          )}

          {phase === "running" && (
            <div className="absolute top-3 right-3 pointer-events-none">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/85 backdrop-blur border border-sky-500/30 text-[11px] font-semibold text-sky-300">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                Live
              </span>
            </div>
          )}

          {phase === "success" && (
            <div className="absolute inset-0 bg-slate-950/88 backdrop-blur-sm flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/30 to-green-500/10 flex items-center justify-center mb-4 border border-emerald-500/35 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <p className="text-xl font-bold text-slate-100">All done!</p>
              <p className="text-sm text-slate-400 mt-2">Moving to the next step...</p>
            </div>
          )}
        </div>
      )}

      {phase === "running" && (
        <p className="text-center text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed min-h-[2rem]">
          {challenge.hint}
        </p>
      )}
    </div>
  );
}
