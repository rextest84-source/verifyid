import type { ChallengeConfig } from "./types";

export const FACE_API_WEIGHTS =
  "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights";

export const CANVAS_WIDTH = 480;
export const CANVAS_HEIGHT = 640;

/** Target centering for full lock (progress still builds below this). */
export const ALIGN_MIN_CENTERING = 0.3;
/** Target face size for full lock. */
export const ALIGN_MIN_FACE_SCALE = 0.1;
/** Lock-in speed when face is well positioned. */
export const ALIGN_PROGRESS_GAIN = 0.095;
/** Gentle fade when face drifts away. */
export const ALIGN_PROGRESS_DECAY = 0.025;
/** Minimum face presence to accumulate any align progress. */
export const ALIGN_MIN_CENTERING_FLOOR = 0.16;
export const ALIGN_MIN_SCALE_FLOOR = 0.055;

export const BLINK_DROP_RATIO = 0.84;
export const BLINK_RECOVER_RATIO = 0.9;
export const BLINK_MIN_DROP = 0.018;
export const BLINK_MIN_OPEN_FRAMES = 4;

/** Yaw change from calibrated neutral pose required for a turn. */
export const TURN_DELTA_THRESHOLD = 0.06;
export const TURN_PROGRESS_GAIN = 0.14;
export const TURN_PROGRESS_DECAY = 0.035;
export const TURN_BASELINE_FRAMES = 4;

export const HOLD_DURATION_MS = 750;
export const HOLD_MIN_CENTERING = 0.26;
export const HOLD_BREAK_GRACE_FRAMES = 10;

export const FACE_MISS_GRACE_FRAMES = 28;

/** Minimum time per step — prevents instant skip but stays reasonable. */
export const MIN_STEP_MS = {
  align: 350,
  blink: 650,
  turn_left: 450,
  turn_right: 450,
  hold: 600,
} as const;

export const DETECTION_TARGET_MS = 33;
export const BLINK_DETECTION_TARGET_MS = 16;
export const SUCCESS_TRANSITION_MS = 700;

export const CHALLENGES: readonly ChallengeConfig[] = [
  {
    id: "align",
    title: "Position",
    instruction: "Center your face in the oval",
    hint: "Watch the scan line — the ring fills as we lock on",
  },
  {
    id: "blink",
    title: "Blink",
    instruction: "Blink once, naturally",
    hint: "A normal blink is all we need",
  },
  {
    id: "turn_left",
    title: "Turn Left",
    instruction: "Turn toward the left arrow",
    hint: "Follow the arrow on screen — a small turn is enough",
  },
  {
    id: "turn_right",
    title: "Turn Right",
    instruction: "Turn toward the right arrow",
    hint: "Follow the arrow on screen — keep shoulders relaxed",
  },
  {
    id: "hold",
    title: "Hold Still",
    instruction: "Hold steady for a moment",
    hint: "Almost done — stay relaxed and look at the camera",
  },
] as const;
