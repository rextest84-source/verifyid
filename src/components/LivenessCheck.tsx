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
  onComplete: () => void;
}

const CHALLENGE_ICONS = [ScanFace, Eye, MoveHorizontal, MoveHorizontal, Shield] as const;

export default function LivenessCheck({ onComplete }: LivenessCheckProps) {
  const { videoRef, canvasRef, phase, error, challenge, start, challengeCount } =
    useLivenessSession(onComplete);

  const isActive = phase === "loading" || phase === "running" || phase === "success";
  const overallProgress =
    phase === "success"
      ? 100
      : Math.round(((challenge.index + challenge.progress) / challengeCount) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          Premium biometric liveness
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-100">
            {phase === "success"
              ? "Liveness verified"
              : phase === "running" || phase === "loading"
                ? challenge.instruction
                : "Interactive face verification"}
          </h3>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
            {phase === "idle"
              ? "Five quick challenges confirm you are a real person — blink, turn, and hold still."
              : phase === "loading"
                ? "Initializing secure camera session..."
                : challenge.hint}
          </p>
        </div>
      </div>

      {/* Challenge stepper */}
      {isActive && phase !== "success" && (
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          {Array.from({ length: challengeCount }).map((_, idx) => {
            const Icon = CHALLENGE_ICONS[idx] ?? Shield;
            const done = idx < challenge.index;
            const active = idx === challenge.index;
            return (
              <div
                key={idx}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all duration-300 ${
                  done
                    ? "bg-green-500/10 border-green-500/30 text-green-400"
                    : active
                      ? "bg-sky-500/15 border-sky-500/40 text-sky-300 scale-105"
                      : "bg-slate-800/50 border-slate-700/50 text-slate-500"
                }`}
              >
                {done ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : active && phase === "running" ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Icon className="w-3 h-3" />
                )}
                <span className="hidden sm:inline">{CHALLENGE_LABELS[idx]}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Overall progress */}
      {isActive && (
        <div className="space-y-2 max-w-sm mx-auto">
          <div className="flex justify-between text-[11px] text-slate-500 font-medium">
            <span>{phase === "success" ? "Complete" : challenge.feedback}</span>
            <span>{overallProgress}%</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-300 ease-out rounded-full"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 rounded-xl px-4 py-3 border border-red-500/20 max-w-sm mx-auto">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4">
          <div className="grid grid-cols-3 gap-3 max-w-sm w-full text-center">
            {[
              { label: "Face map", desc: "68-point mesh" },
              { label: "Blink test", desc: "Anti-spoof" },
              { label: "Head pose", desc: "3D movement" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-slate-800 bg-slate-900/60 px-2 py-3"
              >
                <p className="text-xs font-semibold text-slate-200">{item.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
          <Button
            onClick={start}
            className="bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white shadow-lg shadow-sky-500/20"
            size="lg"
          >
            <Camera className="w-4 h-4 mr-2" />
            Begin Liveness Check
          </Button>
        </div>
      )}

      {/* Viewfinder — mount only when active so iOS gets a sized video element */}
      {phase !== "idle" && (
      <div
        className="relative rounded-2xl overflow-hidden border mx-auto max-w-sm border-slate-700/80 shadow-2xl shadow-sky-500/10 bg-slate-950"
        style={{ aspectRatio: `${CANVAS_WIDTH}/${CANVAS_HEIGHT}` }}
      >
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none -scale-x-100"
          muted
          playsInline
          autoPlay
        />
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {phase === "loading" && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
            <p className="text-sm text-slate-400">Loading face models...</p>
          </div>
        )}

        {phase === "running" && (
          <>
            <div className="absolute top-3 left-3">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-700/60 text-[11px] font-semibold text-slate-200 backdrop-blur-sm">
                {challenge.title}
              </span>
            </div>
            <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-red-500/30 text-[11px] font-bold text-red-400 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              LIVE
            </div>
          </>
        )}

        {phase === "success" && (
          <div className="absolute inset-0 bg-slate-950/85 flex flex-col items-center justify-center animate-in fade-in duration-500">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500/30 to-emerald-500/10 flex items-center justify-center mb-4 border border-green-500/30">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
            <p className="text-xl font-bold text-slate-100">Liveness Verified</p>
            <p className="text-sm text-slate-400 mt-2">All challenges passed</p>
          </div>
        )}
      </div>
      )}

      {isActive && phase === "running" && (
        <div className="flex items-center justify-center gap-5 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-sky-500" />
            Anti-spoofing active
          </span>
          <span className="flex items-center gap-1.5">
            <ScanFace className="w-3 h-3 text-sky-500" />
            On-device analysis
          </span>
          <span className="flex items-center gap-1.5">
            <Eye className="w-3 h-3 text-sky-500" />
            Blink + pose checks
          </span>
        </div>
      )}
    </div>
  );
}

const CHALLENGE_LABELS = ["Align", "Blink", "Left", "Right", "Hold"];
