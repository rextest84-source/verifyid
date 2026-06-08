import { useCallback, useEffect, useRef, useState } from "react";
import { LivenessChallengeEngine } from "./challengeEngine";
import { CANVAS_HEIGHT, CANVAS_WIDTH, CHALLENGES } from "./constants";
import { detectFace, loadFaceModels } from "./faceModels";
import { renderLivenessFrame } from "./canvasRenderer";
import { emptyMetrics } from "./geometry";
import type { ChallengeSnapshot, LivenessPhase, RenderState } from "./types";

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

function waitForNextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/** iOS Safari needs loadedmetadata + playing before canvas drawImage works. */
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

export function useLivenessSession(onComplete: () => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef(0);
  const engineRef = useRef(new LivenessChallengeEngine());
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [phase, setPhase] = useState<LivenessPhase>("idle");
  const [error, setError] = useState("");
  const [challenge, setChallenge] = useState<ChallengeSnapshot>(INITIAL_CHALLENGE);

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
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const start = useCallback(() => {
    setError("");
    engineRef.current.reset();
    setChallenge(INITIAL_CHALLENGE);
    setPhase("loading");
  }, []);

  useEffect(() => {
    if (phase !== "loading") return;

    let cancelled = false;

    const initCamera = async () => {
      await waitForNextFrame();

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
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

        await loadFaceModels();
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

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    let running = true;

    const tick = async () => {
      if (!running) return;

      if (video.paused || video.ended || !video.videoWidth) {
        animRef.current = requestAnimationFrame(tick);
        return;
      }

      const timestamp = Date.now();
      const face = await detectFace(video);
      const { snapshot, metrics } = engineRef.current.process(
        face,
        video.videoWidth,
        video.videoHeight,
        timestamp,
      );

      setChallenge(snapshot);

      const renderState: RenderState = {
        phase: engineRef.current.isComplete ? "success" : "running",
        challenge: snapshot,
        metrics: metrics.hasFace ? metrics : emptyMetrics(),
        timestamp,
        face,
      };

      renderLivenessFrame(ctx, video, renderState, video.videoWidth, video.videoHeight);

      if (engineRef.current.isComplete) {
        setPhase("success");
        stopCamera();
        setTimeout(() => onCompleteRef.current(), 1400);
        return;
      }

      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [phase, stopCamera]);

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
