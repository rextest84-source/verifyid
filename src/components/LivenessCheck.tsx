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
  Zap,
} from "lucide-react";

interface LivenessCheckProps {
  onComplete: () => void;
}

const CHALLENGE_ICONS = [ScanFace, Eye, MoveHorizontal, MoveHorizontal, Shield] as const;

function SensorBar({ label, value, active }: { label: string; value: number; active?: boolean }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-medium text-slate-500">
        <span>{label}</span>
        <span className={active ? "text-sky-400" : "text-slate-600"}>{pct}%</span>
      </div>
      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-75 ${
            active ? "bg-gradient-to-r from-sky-500 to-cyan-400" : "bg-slate-600"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function LivenessCheck({ onComplete }: LivenessCheckProps) {
  const { videoRef, canvasRef, phase, error, challenge, sensors, start, challengeCount } =
    useLivenessSession(onComplete);

  const isActive = phase === "loading" || phase === "running" || phase === "success";
  const overallProgress =
    phase === "success"
      ? 100
      : Math.round(((challenge.index + challenge.progress) / challengeCount) * 100);

  return (
    <div className="space-y-5">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-medium">
          <Zap className="w-3.5 h-3.5" />
          Real-time liveness
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-100">
            {phase === "success"
              ? "Liveness verified"
              : phase === "running"
                ? challenge.feedback
                : phase === "loading"
                  ? "Starting camera..."
                  : "Interactive face verification"}
          </h3>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
            {phase === "idle"
              ? "Fast, seamless checks — align, blink, turn, and hold still."
              : phase === "loading"
                ? "Warming up sensors..."
                : challenge.hint}
          </p>
        </div>
      </div>

      {isActive && phase !== "success" && (
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          {Array.from({ length: challengeCount }).map((_, idx) => {
            const Icon = CHALLENGE_ICONS[idx] ?? Shield;
            const done = idx < challenge.index;
            const active = idx === challenge.index;
            return (
              <div
                key={idx}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all duration-150 ${
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
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                ) : (
                  <Icon className="w-3 h-3" />
                )}
                <span className="hidden sm:inline">{CHALLENGE_LABELS[idx]}</span>
              </div>
            );
          })}
        </div>
      )}

      {isActive && (
        <div className="space-y-2 max-w-sm mx-auto">
          <div className="flex justify-between text-[11px] text-slate-500 font-medium">
            <span>{phase === "success" ? "Complete" : challenge.feedback}</span>
            <span>{overallProgress}%</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-75 ease-out rounded-full"
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
              { label: "Real-time", desc: "30+ scans/sec" },
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
            <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
              <p className="text-sm text-slate-400">Activating sensors...</p>
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
                <span
                  className={`w-1.5 h-1.5 rounded-full bg-red-500 ${sensors.isScanning ? "animate-ping" : "animate-pulse"}`}
                />
                LIVE
              </div>
            </>
          )}

          {phase === "success" && (
            <div className="absolute inset-0 bg-slate-950/85 flex flex-col items-center justify-center animate-in fade-in duration-300">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500/30 to-emerald-500/10 flex items-center justify-center mb-4 border border-green-500/30">
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </div>
              <p className="text-xl font-bold text-slate-100">Liveness Verified</p>
              <p className="text-sm text-slate-400 mt-2">All challenges passed</p>
            </div>
          )}
        </div>
      )}

      {phase === "running" && (
        <div className="max-w-sm mx-auto space-y-3">
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/50">
            <SensorBar
              label="Face lock"
              value={sensors.faceDetected ? sensors.faceScore : 0}
              active={sensors.faceDetected}
            />
            <SensorBar label="Centering" value={sensors.centering} active={sensors.centering > 0.4} />
            <SensorBar label="Distance" value={sensors.faceScale} active={sensors.faceScale > 0.14} />
            <SensorBar
              label={challenge.id === "blink" ? "Eye open" : challenge.id.includes("turn") ? "Head turn" : "Stability"}
              value={
                challenge.id === "blink"
                  ? Math.min(1, sensors.ear / 0.35)
                  : challenge.id.includes("turn")
                    ? Math.min(1, Math.abs(sensors.yaw) / 0.25)
                    : sensors.centering
              }
              active={sensors.isScanning}
            />
          </div>
          <div className="flex items-center justify-center gap-4 text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <span
                className={`w-1.5 h-1.5 rounded-full ${sensors.isScanning ? "bg-green-400 animate-pulse" : "bg-sky-500"}`}
              />
              {sensors.detectionsPerSec} scans/s
            </span>
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-sky-500" />
              Anti-spoof
            </span>
            <span className="flex items-center gap-1">
              <ScanFace className="w-3 h-3 text-sky-500" />
              On-device
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

const CHALLENGE_LABELS = ["Align", "Blink", "Left", "Right", "Hold"];
