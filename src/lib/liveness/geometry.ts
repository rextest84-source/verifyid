import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./constants";
import type { FaceBox, FaceLandmarks, FrameMetrics, Point2D } from "./types";

/** Map a point from camera pixels to canvas coords (object-cover crop + mirror). */
export function mapVideoToCanvas(
  x: number,
  y: number,
  videoW: number,
  videoH: number,
  canvasW = CANVAS_WIDTH,
  canvasH = CANVAS_HEIGHT,
): Point2D {
  const videoAspect = videoW / videoH;
  const canvasAspect = canvasW / canvasH;

  let sourceX: number;
  let sourceY: number;
  let sourceW: number;
  let sourceH: number;

  if (videoAspect > canvasAspect) {
    sourceH = videoH;
    sourceW = videoH * canvasAspect;
    sourceX = (videoW - sourceW) / 2;
    sourceY = 0;
  } else {
    sourceW = videoW;
    sourceH = videoW / canvasAspect;
    sourceX = 0;
    sourceY = (videoH - sourceH) / 2;
  }

  const nx = (x - sourceX) / sourceW;
  const ny = (y - sourceY) / sourceH;
  return {
    x: canvasW - nx * canvasW,
    y: ny * canvasH,
  };
}

export function distance(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Eye Aspect Ratio — reliable blink signal from 6 landmark points per eye. */
export function eyeAspectRatio(eye: Point2D[]): number {
  if (eye.length < 6) return 1;
  const vertical =
    distance(eye[1], eye[5]) + distance(eye[2], eye[4]);
  const horizontal = distance(eye[0], eye[3]);
  if (horizontal === 0) return 1;
  return vertical / (2 * horizontal);
}

export function computeEar(landmarks: FaceLandmarks): number {
  const left = eyeAspectRatio(landmarks.getLeftEye());
  const right = eyeAspectRatio(landmarks.getRightEye());
  // Use the lower EAR — more sensitive when either eye closes during a blink.
  return Math.min(left, right);
}

/**
 * Normalized yaw estimate from nose offset within the face box.
 * Positive = user turned their head to their left.
 */
export function computeYaw(landmarks: FaceLandmarks, box: FaceBox): number {
  const nose = landmarks.getNose();
  if (!nose.length) return 0;

  const noseTip = nose[Math.floor(nose.length / 2)];
  const faceCenterX = box.x + box.width / 2;
  const halfWidth = Math.max(box.width / 2, 1);
  // Negate so directions match what the user sees in the mirrored selfie preview.
  return -((noseTip.x - faceCenterX) / halfWidth);
}

export function computeCentering(box: FaceBox, videoW: number, videoH: number): number {
  const faceCX = box.x + box.width / 2;
  const faceCY = box.y + box.height / 2;
  const dx = Math.abs(faceCX - videoW / 2) / (videoW / 2);
  const dy = Math.abs(faceCY - videoH / 2) / (videoH / 2);
  return Math.max(0, 1 - (dx + dy) / 2);
}

export function computeFaceScale(box: FaceBox, videoW: number): number {
  return Math.min(1, box.width / (videoW * 0.38));
}

export function extractMetrics(
  landmarks: FaceLandmarks,
  box: FaceBox,
  videoW: number,
  videoH: number,
): Omit<FrameMetrics, "hasFace"> {
  return {
    centering: computeCentering(box, videoW, videoH),
    faceScale: computeFaceScale(box, videoW),
    ear: computeEar(landmarks),
    yaw: computeYaw(landmarks, box),
  };
}

export function emptyMetrics(): FrameMetrics {
  return {
    hasFace: false,
    centering: 0,
    faceScale: 0,
    ear: 1,
    yaw: 0,
  };
}
