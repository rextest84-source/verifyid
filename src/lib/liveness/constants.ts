import type { ChallengeConfig } from "./types";

export const FACE_API_WEIGHTS =
  "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights";

export const CANVAS_WIDTH = 480;
export const CANVAS_HEIGHT = 640;

/** How centered the face must be in frame (lower = more forgiving). */
export const ALIGN_MIN_CENTERING = 0.3;
/** How close the face must be (lower = more forgiving). */
export const ALIGN_MIN_FACE_SCALE = 0.11;
/** Smooth lock-in speed per good frame (higher = faster). */
export const ALIGN_PROGRESS_GAIN = 0.14;
/** How quickly align progress fades when face drifts (lower = less punishing). */
export const ALIGN_PROGRESS_DECAY = 0.035;

export const BLINK_DROP_RATIO = 0.88;
export const BLINK_RECOVER_RATIO = 0.88;
export const BLINK_MIN_DROP = 0.01;

/** Minimum head yaw to count as a turn (lower = smaller movement accepted). */
export const TURN_YAW_THRESHOLD = 0.055;
export const TURN_PROGRESS_GAIN = 0.22;
export const TURN_PROGRESS_DECAY = 0.05;

export const HOLD_DURATION_MS = 550;
export const HOLD_MIN_CENTERING = 0.26;
/** Brief wobbles during hold won't reset the timer. */
export const HOLD_BREAK_GRACE_FRAMES = 10;

export const FACE_MISS_GRACE_FRAMES = 35;

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
