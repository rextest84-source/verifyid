import { useCallback, useEffect, useRef, useState } from "react";
import { LivenessChallengeEngine } from "./challengeEngine";
import {
  BLINK_DETECTION_TARGET_MS,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CHALLENGES,
  DETECTION_TARGET_MS,
  SUCCESS_TRANSITION_MS,
} from "./constants";
import { detectFace, loadFaceModels, preloadFaceModels } from "./faceModels";
import { renderLivenessFrame } from "./canvasRenderer";
import { emptyMetrics } from "./geometry";
import { shouldMirrorSelfiePreview } from "./previewMirror";
import { captureVideoFrame, uploadImageFile } from "@/lib/upload";
import type {
  ChallengeSnapshot,
  FaceBox,
  FaceDetectionResult,
  LiveSensors,
  LivenessPhase,
  RenderState,
} from "./types";

const INITIAL_CHALLENGE: ChallengeSnapshot = {
  id: CHALLENGES[0].id,
  index: 0,
  total: CHALLENGES.length,
  progress: 0,
  title: CHALLENGES[0].title,
  instruction: CHALLENGES[0].instruction,
  hint: CHALLENGES[0].hint,
  feedback: "Ready when you are",
  isComplete: false,
};

const INITIAL_SENSORS: LiveSensors = {
  faceDetected: false,
  faceScore: 0,
  centering: 0,
  faceScale: 0,
  ear: 1,
  yaw: 0,
  isScanning: false,
  detectionsPerSec: 0,
};

function waitForNextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function waitForVideoReady(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const finish = () => {
      cleanup();
      if (video.videoWidth > 0) resolve();
      else reject(new Error("Camera returned no frames"));
    };
    const fail = () => {
      cleanup();
      reject(new Error("Camera failed to start"));
    };
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", finish);
      video.removeEventListener("loadeddata", finish);
      video.removeEventListener("playing", finish);
      video.removeEventListener("error", fail);
    };

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
      resolve();
      return;
    }

    video.addEventListener("loadedmetadata", finish);
    video.addEventListener("loadeddata", finish);
    video.addEventListener("playing", finish);
    video.addEventListener("error", fail);
    void video.play().catch(fail);
  });
}

function snapshotUiKey(snapshot: ChallengeSnapshot): string {
  return `${snapshot.index}:${snapshot.id}:${Math.floor(snapshot.progress * 12)}`;
}

function smoothBox(prev: FaceBox | null, next: FaceBox, alpha = 0.22): FaceBox {
  if (!prev) return next;
  return {
    x: prev.x + (next.x - prev.x) * alpha,
    y: prev.y + (next.y - prev.y) * alpha,
    width: prev.width + (next.width - prev.width) * alpha,
    height: prev.height + (next.height - prev.height) * alpha,
  };
}

function smoothFace(
  prev: FaceDetectionResult | null,
  next: FaceDetectionResult | null,
): FaceDetectionResult | null {
  if (!next) return null;
  if (!prev) return next;
  return {
    detection: {
      ...next.detection,
      box: smoothBox(prev.detection.box, next.detection.box),
    },
    landmarks: next.landmarks,
  };
}

function buildSensors(
  face: FaceDetectionResult | null,
  metrics: ReturnType<typeof emptyMetrics>,
  isScanning: boolean,
  detectionsPerSec: number,
): LiveSensors {
  return {
    faceDetected: !!face,
    faceScore: face?.detection.score ?? 0,
    centering: metrics.centering,
    faceScale: metrics.faceScale,
    ear: metrics.ear,
    yaw: metrics.yaw,
    isScanning,
    detectionsPerSec,
  };
}

export function useLivenessSession(onComplete: (snapshotUrl?: string) => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef(0);
  const engineRef = useRef(new LivenessChallengeEngine());
  const onCompleteRef = useRef(onComplete);
  const faceRef = useRef<FaceDetectionResult | null>(null);
  const displayFaceRef = useRef<FaceDetectionResult | null>(null);
  const challengeRef = useRef(INITIAL_CHALLENGE);
  const metricsRef = useRef(emptyMetrics());
  const sensorsRef = useRef<LiveSensors>(INITIAL_SENSORS);
  const detectInFlightRef = useRef(false);
  const lastDetectAtRef = useRef(0);
  const lastUiKeyRef = useRef("");
  const lastUiPublishRef = useRef(0);
  const detectTimestampsRef = useRef<number[]>([]);
  onCompleteRef.current = onComplete;

  const [phase, setPhase] = useState<LivenessPhase>("idle");
  const [error, setError] = useState("");
  const [challenge, setChallenge] = useState<ChallengeSnapshot>(INITIAL_CHALLENGE);

  useEffect(() => {
    void preloadFaceModels();
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
    faceRef.current = null;
    displayFaceRef.current = null;
    detectInFlightRef.current = false;
    detectTimestampsRef.current = [];
  }, []);

  const finishSession = useCallback(
    async (video: HTMLVideoElement) => {
      let snapshotUrl: string | undefined;
      try {
        const frame = await captureVideoFrame(video);
        if (frame) {
          const url = await uploadImageFile(frame, "liveness-selfie.jpg");
          if (url) snapshotUrl = url;
        }
      } catch {
        // Submission can proceed without the snapshot if upload fails.
      }

      stopCamera();
      setTimeout(() => onCompleteRef.current(snapshotUrl), SUCCESS_TRANSITION_MS);
    },
    [stopCamera],
  );

  useEffect(() => () => stopCamera(), [stopCamera]);

  const publishUi = useCallback((snapshot: ChallengeSnapshot) => {
    const key = snapshotUiKey(snapshot);
    const stepChanged = snapshot.index !== challengeRef.current.index;
    const now = Date.now();

    if (stepChanged || key !== lastUiKeyRef.current) {
      lastUiKeyRef.current = key;
      lastUiPublishRef.current = now;
      setChallenge(snapshot);
      return;
    }

    if (now - lastUiPublishRef.current > 350) {
      lastUiKeyRef.current = key;
      lastUiPublishRef.current = now;
      setChallenge(snapshot);
    }
  }, []);

  const start = useCallback(() => {
    setError("");
    engineRef.current.reset();
    challengeRef.current = INITIAL_CHALLENGE;
    sensorsRef.current = INITIAL_SENSORS;
    lastUiKeyRef.current = "";
    lastUiPublishRef.current = 0;
    displayFaceRef.current = null;
    setChallenge(INITIAL_CHALLENGE);
    setPhase("loading");
  }, []);

  useEffect(() => {
    if (phase !== "loading") return;

    let cancelled = false;

    const initCamera = async () => {
      await waitForNextFrame();

      try {
        await loadFaceModels();
        if (cancelled) return;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
            frameRate: { ideal: 30, max: 30 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) throw new Error("Video element not ready");

        video.setAttribute("playsinline", "true");
        video.setAttribute("webkit-playsinline", "true");
        video.muted = true;
        video.autoplay = true;
        video.playsInline = true;
        video.srcObject = stream;

        await waitForVideoReady(video);
        if (cancelled) return;

        setPhase("running");
      } catch {
        if (cancelled) return;
        setPhase("error");
        setError("Camera access is required. Please allow permissions and try again.");
        stopCamera();
      }
    };

    void initCamera();

    return () => {
      cancelled = true;
    };
  }, [phase, stopCamera]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || phase !== "running") return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    let running = true;
    const mirrorPreview = shouldMirrorSelfiePreview();
    const sensorMirrored = !mirrorPreview;

    const runDetection = (now: number) => {
      if (!running || detectInFlightRef.current || !video.videoWidth) return;

      const targetMs =
        engineRef.current.currentChallengeId === "blink"
          ? BLINK_DETECTION_TARGET_MS
          : DETECTION_TARGET_MS;

      if (now - lastDetectAtRef.current < targetMs) return;

      lastDetectAtRef.current = now;
      detectInFlightRef.current = true;

      void detectFace(video)
        .then((face) => {
          if (!running) return;

          const ts = performance.now();
          detectTimestampsRef.current.push(ts);
          detectTimestampsRef.current = detectTimestampsRef.current.filter((t) => ts - t < 1000);

          faceRef.current = face;
          displayFaceRef.current = face ? smoothFace(displayFaceRef.current, face) : null;
          const { snapshot, metrics } = engineRef.current.process(
            face,
            video.videoWidth,
            video.videoHeight,
            Date.now(),
            sensorMirrored,
          );

          challengeRef.current = snapshot;
          metricsRef.current = metrics;

          const dps = detectTimestampsRef.current.length;
          sensorsRef.current = buildSensors(face, metrics, false, dps);
          publishUi(snapshot);

          if (engineRef.current.isComplete) {
            setPhase("success");
            void finishSession(video);
          }
        })
        .finally(() => {
          detectInFlightRef.current = false;
        });
    };

    const tick = (timestamp: number) => {
      if (!running) return;

      if (!video.paused && !video.ended && video.videoWidth) {
        runDetection(timestamp);

        const engine = engineRef.current;
        let snapshot = challengeRef.current;

        if (snapshot.id === "hold") {
          const smooth = engine.getHoldProgress(timestamp);
          if (smooth > snapshot.progress) {
            snapshot = { ...snapshot, progress: smooth };
          }
        }

        const liveSensors = {
          ...sensorsRef.current,
          isScanning: detectInFlightRef.current,
          detectionsPerSec: detectTimestampsRef.current.length,
        };
        sensorsRef.current = liveSensors;

        const renderState: RenderState = {
          phase: engine.isComplete ? "success" : "running",
          challenge: snapshot,
          metrics: metricsRef.current,
          timestamp,
          face: displayFaceRef.current,
          sensors: liveSensors,
        };

        renderLivenessFrame(ctx, renderState, video.videoWidth, video.videoHeight, mirrorPreview);
      }

      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [phase, stopCamera, publishUi, finishSession]);

  return {
    videoRef,
    canvasRef,
    phase,
    error,
    challenge,
    start,
    stopCamera,
    challengeCount: CHALLENGES.length,
  };
}
