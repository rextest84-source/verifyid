import type { ChallengeConfig } from "./types";

export const FACE_API_WEIGHTS =
  "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights";

export const CANVAS_WIDTH = 480;
export const CANVAS_HEIGHT = 640;

export const ALIGN_MIN_CENTERING = 0.62;
export const ALIGN_MIN_FACE_SCALE = 0.28;
export const ALIGN_FRAMES_REQUIRED = 18;

export const BLINK_CLOSED_EAR = 0.2;
export const BLINK_OPEN_EAR = 0.24;

export const TURN_YAW_THRESHOLD = 0.14;
export const TURN_FRAMES_REQUIRED = 14;

export const HOLD_DURATION_MS = 1800;
export const HOLD_MIN_CENTERING = 0.55;

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
