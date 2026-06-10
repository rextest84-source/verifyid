import { Lightbulb, ScanFace, Sun, UserRound, Glasses } from "lucide-react";

export const LIVENESS_PREP_STEPS = [
  {
    icon: Sun,
    title: "Well-lit environment",
    detail: "Stand or sit in a brightly lit area. Avoid strong backlighting or shadows across your face.",
  },
  {
    icon: ScanFace,
    title: "Face the camera directly",
    detail: "Hold your device at eye level and keep your full face clearly visible within the frame.",
  },
  {
    icon: Glasses,
    title: "Remove obstructions",
    detail: "Take off hats, sunglasses, or anything that covers your eyes, nose, or mouth.",
  },
  {
    icon: UserRound,
    title: "One person only",
    detail: "Ensure you are the only person visible. A plain background helps the scan lock in faster.",
  },
  {
    icon: Lightbulb,
    title: "Follow on-screen prompts",
    detail: "When the ring turns green, blink and turn your head slowly as directed by the arrows.",
  },
] as const;
