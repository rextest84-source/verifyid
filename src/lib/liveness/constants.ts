import type { ChallengeConfig } from "./types";

export const FACE_API_WEIGHTS =
  "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights";

export const CANVAS_WIDTH = 480;
export const CANVAS_HEIGHT = 640;

export const ALIGN_MIN_CENTERING = 0.38;
export const ALIGN_MIN_FACE_SCALE = 0.14;
export const ALIGN_FRAMES_REQUIRED = 4;

export const BLINK_DROP_RATIO = 0.85;
export const BLINK_RECOVER_RATIO = 0.9;
export const BLINK_MIN_DROP = 0.015;

export const TURN_YAW_THRESHOLD = 0.08;
export const TURN_FRAMES_REQUIRED = 4;

export const HOLD_DURATION_MS = 700;
export const HOLD_MIN_CENTERING = 0.35;

export const FACE_MISS_GRACE_FRAMES = 18;

/** Target gap between detection runs (ms) — ~30 fps. */
export const DETECTION_TARGET_MS = 33;
/** Max rate during blink step (ms) — ~60 fps. */
export const BLINK_DETECTION_TARGET_MS = 16;

export const SUCCESS_TRANSITION_MS = 700;

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
