import * as faceapi from "face-api.js";
import { FACE_API_WEIGHTS } from "./constants";
import type { FaceDetectionResult } from "./types";

let modelsLoaded = false;
let loadPromise: Promise<void> | null = null;
let detectCanvas: HTMLCanvasElement | null = null;

const DETECTOR = new faceapi.TinyFaceDetectorOptions({
  inputSize: 224,
  scoreThreshold: 0.32,
});

export function preloadFaceModels(): Promise<void> {
  if (modelsLoaded) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(FACE_API_WEIGHTS),
    faceapi.nets.faceLandmark68Net.loadFromUri(FACE_API_WEIGHTS),
  ]).then(() => {
    modelsLoaded = true;
  });

  return loadPromise;
}

export async function loadFaceModels(): Promise<void> {
  await preloadFaceModels();
}

function getDetectCanvas(width: number, height: number): HTMLCanvasElement {
  if (!detectCanvas) {
    detectCanvas = document.createElement("canvas");
  }
  detectCanvas.width = width;
  detectCanvas.height = height;
  return detectCanvas;
}

/**
 * Run face detection on a frame normalized to selfie display space.
 * When flipToDisplaySpace is true (desktop), the frame is mirrored before detection
 * so yaw/overlay coords match what the user sees on screen.
 */
export async function detectFace(
  video: HTMLVideoElement,
  flipToDisplaySpace = true,
): Promise<FaceDetectionResult | null> {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return null;

  const canvas = getDetectCanvas(w, h);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    const result = await faceapi.detectSingleFace(video, DETECTOR).withFaceLandmarks();
    return result ?? null;
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  if (flipToDisplaySpace) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, w, h);

  const result = await faceapi.detectSingleFace(canvas, DETECTOR).withFaceLandmarks();
  return result ?? null;
}
