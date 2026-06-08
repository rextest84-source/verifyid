import * as faceapi from "face-api.js";
import { FACE_API_WEIGHTS } from "./constants";
import type { FaceDetectionResult } from "./types";

let modelsLoaded = false;
let loadPromise: Promise<void> | null = null;

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

export async function detectFace(
  video: HTMLVideoElement,
): Promise<FaceDetectionResult | null> {
  const result = await faceapi
    .detectSingleFace(video, DETECTOR)
    .withFaceLandmarks(false);

  return result ?? null;
}
