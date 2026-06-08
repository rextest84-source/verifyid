import type { ChallengeConfig } from "./types";

export const FACE_API_WEIGHTS =
  "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights";

export const CANVAS_WIDTH = 480;
export const CANVAS_HEIGHT = 640;

/** How centered the face must be in frame (moderate — not too strict). */
export const ALIGN_MIN_CENTERING = 0.34;
/** How close the face must be. */
export const ALIGN_MIN_FACE_SCALE = 0.12;
/** Smooth lock-in speed per good frame (lower = takes longer to lock). */
export const ALIGN_PROGRESS_GAIN = 0.065;
/** How quickly align progress fades when face drifts (gentle decay). */
export const ALIGN_PROGRESS_DECAY = 0.03;

export const BLINK_DROP_RATIO = 0.82;
export const BLINK_RECOVER_RATIO = 0.9;
/** Minimum eye-close depth to count as a real blink. */
export const BLINK_MIN_DROP = 0.02;
/** Frames with open eyes before a blink can be accepted. */
export const BLINK_MIN_OPEN_FRAMES = 6;

/** Head yaw must change this much from the step baseline to count as a turn. */
export const TURN_DELTA_THRESHOLD = 0.075;
export const TURN_PROGRESS_GAIN = 0.1;
export const TURN_PROGRESS_DECAY = 0.04;
/** Frames to sample neutral pose before measuring a turn. */
export const TURN_BASELINE_FRAMES = 8;

export const HOLD_DURATION_MS = 900;
export const HOLD_MIN_CENTERING = 0.3;
/** Brief wobbles during hold won't reset the timer. */
export const HOLD_BREAK_GRACE_FRAMES = 8;

export const FACE_MISS_GRACE_FRAMES = 30;

/** Minimum time (ms) each step must run before it can complete. */
export const MIN_STEP_MS = {
  align: 500,
  blink: 900,
  turn_left: 700,
  turn_right: 700,
  hold: 800,
} as const;

/** Target gap between detection runs (ms) — ~30 fps. */
export const DETECTION_TARGET_MS = 33;
/** Max rate during blink step (ms) — ~60 fps. */
export const BLINK_DETECTION_TARGET_MS = 16;

export const SUCCESS_TRANSITION_MS = 700;

export const CHALLENGES: readonly ChallengeConfig[] = [
  {
    id: "align",
    title: "Position",
    instruction: "Center your face in the oval",
    hint: "Move slowly until the ring turns green — no rush",
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
    instruction: "Turn your head slightly left",
    hint: "A small turn is enough — keep shoulders relaxed",
  },
  {
    id: "turn_right",
    title: "Turn Right",
    instruction: "Turn your head slightly right",
    hint: "Just a gentle turn toward your right shoulder",
  },
  {
    id: "hold",
    title: "Hold Still",
    instruction: "Hold steady for a moment",
    hint: "Almost done — stay relaxed and look at the camera",
  },
] as const;
