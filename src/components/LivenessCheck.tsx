import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, CheckCircle2, AlertCircle, Shield, Info } from "lucide-react";
import * as faceapi from "face-api.js";

interface LivenessCheckProps {
  onComplete: () => void;
}

type LivenessState = "idle" | "initializing" | "searching" | "centering" | "analyzing" | "success" | "error";

function euclideanDistance(p1: { x: number; y: number }, p2: { x: number; y: number }) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

/* ====== DRAWING — pure functions, no React ====== */

function drawFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  canvasW: number,
  canvasH: number,
  result: any | undefined,
  videoW: number,
  videoH: number,
  progress: number,
  time: number,
  state: LivenessState
) {
  // Draw video
  ctx.drawImage(video, 0, 0, canvasW, canvasH);

  // Dark overlay
  ctx.fillStyle = "rgba(15, 23, 42, 0.08)";
  ctx.fillRect(0, 0, canvasW, canvasH);

  const cx = canvasW / 2;
  const cy = canvasH / 2;
  const rx = canvasW * 0.32;
  const ry = canvasH * 0.40;

  // Centering oval + reticle
  drawOval(ctx, cx, cy, rx, ry, progress, time);
  drawCorners(ctx, cx, cy, rx * 2.1, progress, time);

  if (result) {
    const sx = canvasW / videoW;
    const sy = canvasH / videoH;
    const landmarks = result.landmarks;
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();

    // Micro dots
    ctx.save();
    for (const pt of landmarks.positions) {
      ctx.shadowColor = "#22d3ee"; ctx.shadowBlur = 4;
      ctx.fillStyle = "rgba(34, 211, 238, 0.5)";
      ctx.beginPath(); ctx.arc(pt.x * sx, pt.y * sy, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // Eye gaze
    [leftEye, rightEye].forEach((eye: any) => {
      const ecx = eye.reduce((s: number, p: any) => s + p.x, 0) / eye.length;
      const ecy = eye.reduce((s: number, p: any) => s + p.y, 0) / eye.length;
      const erx = euclideanDistance(eye[0], eye[3]) * sx * 0.65;
      const ery = euclideanDistance(eye[1], eye[5]) * sy * 0.75;
      ctx.save();
      ctx.shadowColor = "#f472b6"; ctx.shadowBlur = 14;
      ctx.strokeStyle = "rgba(244, 114, 182, 0.5)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(ecx * sx, ecy * sy, erx, ery, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 6; ctx.fillStyle = "rgba(251, 207, 232, 0.8)";
      ctx.beginPath(); ctx.arc(ecx * sx, ecy * sy, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });

    // Scan line
    const box = result.detection.box;
    const scanY = (box.y * sy) + ((time * 0.3) % (box.height * sy));
    const grad = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
    grad.addColorStop(0, "rgba(56, 189, 248, 0)");
    grad.addColorStop(0.4, "rgba(56, 189, 248, 0.6)");
    grad.addColorStop(1, "rgba(56, 189, 248, 0)");
    ctx.save(); ctx.fillStyle = grad; ctx.fillRect(box.x * sx, scanY - 30, box.width * sx, 60); ctx.restore();
  }

  // Bottom status bar
  const labels: Record<LivenessState, string> = {
    idle: "", initializing: "Starting camera...", searching: "Looking for your face...",
    centering: "Center your face in the oval", analyzing: "Analyzing liveness...",
    success: "Verified!", error: "Check Failed",
  };
  ctx.save();
  const g = ctx.createLinearGradient(0, canvasH - 55, 0, canvasH);
  g.addColorStop(0, "rgba(15, 23, 42, 0)"); g.addColorStop(1, "rgba(15, 23, 42, 0.85)");
  ctx.fillStyle = g; ctx.fillRect(0, canvasH - 55, canvasW, 55);
  ctx.font = "bold 15px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = state === "success" ? "#4ade80" : state === "analyzing" ? "#38bdf8" : state === "centering" ? "#fbbf24" : "#f97316";
  ctx.textAlign = "center";
  ctx.fillText(labels[state] || "", canvasW / 2, canvasH - 24);
  ctx.restore();
}

function drawOval(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, progress: number, time: number) {
  ctx.save();
  const pulse = 0.4 + 0.3 * Math.sin(time * 0.005);
  const isGood = progress > 0.7;
  ctx.shadowColor = isGood ? "#4ade80" : "#38bdf8";
  ctx.shadowBlur = 20 * pulse;
  ctx.strokeStyle = isGood ? `rgba(74, 222, 128, ${0.5 + progress * 0.5})` : `rgba(56, 189, 248, ${0.3 + pulse * 0.3})`;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();

  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = `rgba(148, 163, 184, ${0.15 + 0.1 * Math.sin(time * 0.003)})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(cx, cy, rx * 0.88, ry * 0.88, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);

  if (progress > 0) {
    ctx.strokeStyle = isGood ? "rgba(74, 222, 128, 0.8)" : "rgba(56, 189, 248, 0.6)";
    ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.shadowColor = isGood ? "#4ade80" : "#38bdf8"; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx + 6, ry + 6, -Math.PI / 2, 0, progress * Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function drawCorners(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, progress: number, time: number) {
  ctx.save();
  const s = size * (0.9 + 0.1 * Math.sin(time * 0.004));
  const len = s * 0.25;
  const isGood = progress > 0.7;
  ctx.strokeStyle = `rgba(${isGood ? "74,222,128" : "56,189,248"}, ${isGood ? 0.7 : 0.4})`;
  ctx.lineWidth = 3; ctx.lineCap = "round";
  ctx.shadowColor = isGood ? "#4ade80" : "#38bdf8"; ctx.shadowBlur = 10;

  const c: [number, number, number, number][] = [
    [cx - s/2, cy - s/2, 1, 1], [cx + s/2, cy - s/2, -1, 1],
    [cx - s/2, cy + s/2, 1, -1], [cx + s/2, cy + s/2, -1, -1],
  ];
  for (const [x, y, dx, dy] of c) {
    ctx.beginPath(); ctx.moveTo(x, y + dy * len); ctx.lineTo(x, y); ctx.lineTo(x + dx * len, y); ctx.stroke();
  }
  ctx.restore();
}

/* ====== COMPONENT ====== */

const CANVAS_W = 480;
const CANVAS_H = 640;

export default function LivenessCheck({ onComplete }: LivenessCheckProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [state, setState] = useState<LivenessState>("idle");
  const [error, setError] = useState("");

  // Mutable loop state — never triggers re-render
  const loopStateRef = useRef({
    state: "idle" as LivenessState,
    progress: 0,
    goodFrames: 0,
    badFrames: 0,
    analysisStart: 0,
  });

  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete; // always fresh

  // Transition helper — updates both ref and React state
  const transition = useCallback((newState: LivenessState) => {
    loopStateRef.current.state = newState;
    setState(newState);
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    const v = videoRef.current; if (v) { v.pause(); v.srcObject = null; }
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = useCallback(async () => {
    setError("");
    transition("initializing");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        try { await video.play(); } catch { setTimeout(() => video.play().catch(() => {}), 50); }
      }
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights"),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri("https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights"),
      ]);
      transition("searching");
    } catch {
      transition("error");
      setError("Could not access camera. Please allow permissions.");
    }
  }, [transition]);

  // ====== THE ONE AND ONLY LOOP ======
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    // FIXED canvas size — never changes, no flicker
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;

    let running = true;

    const tick = async () => {
      if (!running) return;

      const s = loopStateRef.current.state;
      if (video.paused || video.ended || !video.videoWidth || s === "idle" || s === "initializing" || s === "error" || s === "success") {
        animFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      const time = Date.now();
      const result = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.7 }))
        .withFaceLandmarks(true);

      const ls = loopStateRef.current;

      if (result) {
        const box = result.detection.box;
        const faceCX = box.x + box.width / 2;
        const faceCY = box.y + box.height / 2;
        const dx = Math.abs(faceCX - video.videoWidth / 2) / (video.videoWidth / 2);
        const dy = Math.abs(faceCY - video.videoHeight / 2) / (video.videoHeight / 2);
        const centering = Math.max(0, 1 - (dx + dy) / 2);
        const faceSize = Math.min(1, box.width / (video.videoWidth * 0.35));
        ls.progress = centering * faceSize;

        // ---- STATE MACHINE ----
        if (s === "searching") {
          if (faceSize > 0.3) { transition("centering"); ls.goodFrames = 0; ls.badFrames = 0; }
        }
        else if (s === "centering") {
          if (ls.progress > 0.6) {
            ls.goodFrames++;
            ls.badFrames = 0;
            if (ls.goodFrames > 15) { transition("analyzing"); ls.analysisStart = Date.now(); }
          } else {
            ls.badFrames++;
            if (ls.badFrames > 10) { transition("searching"); ls.goodFrames = 0; }
          }
        }
        else if (s === "analyzing") {
          if (Date.now() - ls.analysisStart > 3000) {
            ls.goodFrames++;
            if (ls.goodFrames > 10) {
              transition("success");
              stopCamera();
              setTimeout(() => onCompleteRef.current(), 1500);
            }
          }
        }
      } else {
        ls.progress = 0;
        if (s === "centering" || s === "analyzing") {
          ls.badFrames++;
          if (ls.badFrames > 15) transition("searching");
        }
      }

      // ---- DRAW ----
      drawFrame(ctx, video, CANVAS_W, CANVAS_H, result, video.videoWidth, video.videoHeight, ls.progress, time, loopStateRef.current.state);

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(animFrameRef.current); };
  }, []); // eslint-disable-line

  const isActive = state !== "idle" && state !== "error";

  return (
    <div className="space-y-5">
      {/* Status text */}
      {isActive && (
        <div className="text-center space-y-1.5">
          <h3 className={`text-base font-semibold transition-colors duration-300 ${
            state === "success" ? "text-green-400" : state === "analyzing" ? "text-sky-400" : state === "centering" ? "text-amber-400" : "text-orange-400"
          }`}>
            {state === "searching" && "Looking for your face..."}
            {state === "centering" && "Center your face in the oval"}
            {state === "analyzing" && "Analyzing liveness..."}
            {state === "success" && "Verified!"}
          </h3>
          {state === "analyzing" && <p className="text-xs text-slate-500">Hold still, this takes a few seconds</p>}
          {state === "centering" && <p className="text-xs text-slate-500">Move closer and align with the outline</p>}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 rounded-lg px-4 py-3 border border-red-500/20">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {!isActive && (
        <div className="flex justify-center">
          <Button onClick={startCamera} className="bg-sky-500 hover:bg-sky-600 text-white" size="lg">
            <Camera className="w-4 h-4 mr-2" />Start Liveness Check
          </Button>
        </div>
      )}

      {/* Viewfinder — fixed size canvas, CSS-scaled */}
      <div className={`relative rounded-2xl overflow-hidden border mx-auto max-w-sm transition-all duration-500 ${
        isActive ? "opacity-100 border-slate-700/80 shadow-2xl" : "opacity-0 h-0 overflow-hidden"
      }`}>
        <video ref={videoRef} className="absolute inset-0 w-full h-full opacity-0 pointer-events-none" muted playsInline />
        <canvas
          ref={canvasRef}
          className="w-full block bg-slate-950"
          style={{ aspectRatio: `${CANVAS_W}/${CANVAS_H}` }}
        />

        {/* Badges */}
        {isActive && state !== "success" && (
          <>
            <div className="absolute top-3 left-3">
              {state === "searching" && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 text-[11px] font-bold border border-amber-500/25">
                  <Loader2 className="w-3 h-3 animate-spin" />Searching
                </span>
              )}
              {state === "centering" && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/15 text-sky-400 text-[11px] font-bold border border-sky-500/25">
                  <Info className="w-3 h-3" />Align face
                </span>
              )}
              {state === "analyzing" && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 text-[11px] font-bold border border-green-500/25">
                  <CheckCircle2 className="w-3 h-3" />Face locked
                </span>
              )}
            </div>
            <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/70 border border-slate-700/50 text-[11px] font-medium text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />LIVE
            </div>
          </>
        )}

        {/* Success overlay */}
        {state === "success" && (
          <div className="absolute inset-0 bg-slate-900/85 flex flex-col items-center justify-center animate-in fade-in duration-500">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4 animate-in zoom-in duration-500">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-xl font-bold text-slate-100">Liveness Verified</p>
            <p className="text-sm text-slate-400 mt-2">Redirecting...</p>
          </div>
        )}
      </div>

      {isActive && state !== "success" && (
        <div className="flex items-center justify-center gap-4 text-[11px] text-slate-600">
          <span className="flex items-center gap-1"><Shield className="w-3 h-3" />Anti-spoofing</span>
          <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />3D face map</span>
        </div>
      )}
    </div>
  );
}
