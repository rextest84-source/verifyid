import type { ChallengeConfig } from "./types";

export const FACE_API_WEIGHTS =
  "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights";

export const CANVAS_WIDTH = 480;
export const CANVAS_HEIGHT = 640;

export const ALIGN_MIN_CENTERING = 0.42;
export const ALIGN_MIN_FACE_SCALE = 0.16;
export const ALIGN_FRAMES_REQUIRED = 8;

/** Eye must drop to this fraction of recent peak EAR to count as closed. */
export const BLINK_DROP_RATIO = 0.85;
/** Eye must recover to this fraction of peak after closing. */
export const BLINK_RECOVER_RATIO = 0.9;
/** Minimum absolute EAR drop required (guards against noise). */
export const BLINK_MIN_DROP = 0.015;

export const TURN_YAW_THRESHOLD = 0.1;
export const TURN_FRAMES_REQUIRED = 8;

export const HOLD_DURATION_MS = 1200;
export const HOLD_MIN_CENTERING = 0.4;

/** Consecutive missed detections before challenge progress decays. */
export const FACE_MISS_GRACE_FRAMES = 12;

/** Run face detection about this often (ms). */
export const DETECTION_INTERVAL_MS = 66;
/** Faster sampling during blink — blinks last ~150–300 ms. */
export const BLINK_DETECTION_INTERVAL_MS = 40;

export const CHALLENGES: readonly ChallengeConfig[] = [
  {
    id: "align",
    title: "Position",
    instruction: "Center your face in the frame",
    hint: "Move closer and align your eyes with the guide",
  },
  {
    id: "blink",
    title: "Blink",
    instruction: "Blink naturally once",
    hint: "Close and open your eyes at a normal pace",
  },
  {
    id: "turn_left",
    title: "Turn Left",
    instruction: "Turn your head slightly left",
    hint: "Keep your shoulders still — rotate only your head",
  },
  {
    id: "turn_right",
    title: "Turn Right",
    instruction: "Turn your head slightly right",
    hint: "Look toward your right shoulder briefly",
  },
  {
    id: "hold",
    title: "Hold Still",
    instruction: "Hold steady while we verify",
    hint: "Keep your face centered for a moment",
  },
] as const;
