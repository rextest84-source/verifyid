import * as faceapi from "face-api.js";
import { FACE_API_WEIGHTS } from "./constants";
import type { FaceDetectionResult } from "./types";

let modelsLoaded = false;

export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;

  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(FACE_API_WEIGHTS),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri(FACE_API_WEIGHTS),
  ]);

  modelsLoaded = true;
}

export async function detectFace(
  video: HTMLVideoElement,
): Promise<FaceDetectionResult | null> {
  const result = await faceapi
    .detectSingleFace(
      video,
      new faceapi.TinyFaceDetectorOptions({
        inputSize: 224,
        scoreThreshold: 0.45,
      }),
    )
    .withFaceLandmarks(true);

  return result ?? null;
}
