import {
  ALIGN_FRAMES_REQUIRED,
  ALIGN_MIN_CENTERING,
  ALIGN_MIN_FACE_SCALE,
  BLINK_CLOSED_RATIO,
  BLINK_OPEN_RATIO,
  CHALLENGES,
  FACE_MISS_GRACE_FRAMES,
  HOLD_DURATION_MS,
  HOLD_MIN_CENTERING,
  TURN_FRAMES_REQUIRED,
  TURN_YAW_THRESHOLD,
} from "./constants";
import { emptyMetrics, extractMetrics } from "./geometry";
import type {
  ChallengeId,
  ChallengeSnapshot,
  FaceDetectionResult,
  FrameMetrics,
} from "./types";

type BlinkPhase = "open" | "closing" | "closed";

export class LivenessChallengeEngine {
  private index = 0;
  private alignFrames = 0;
  private turnFrames = 0;
  private blinkPhase: BlinkPhase = "open";
  private holdStartedAt: number | null = null;
  private missedFaceFrames = 0;
  private lastProgress = 0;
  private earBaseline = 0.28;
  private earSamples: number[] = [];

  reset(): void {
    this.index = 0;
    this.resetCurrentChallenge();
    this.missedFaceFrames = 0;
    this.lastProgress = 0;
  }

  get isComplete(): boolean {
    return this.index >= CHALLENGES.length;
  }

  process(
    face: FaceDetectionResult | null,
    videoW: number,
    videoH: number,
    timestamp: number,
  ): { snapshot: ChallengeSnapshot; metrics: FrameMetrics } {
    if (this.isComplete) {
      return {
        snapshot: this.buildSnapshot(1, "Verification complete", true),
        metrics: face
          ? { hasFace: true, ...extractMetrics(face.landmarks, face.detection.box, videoW, videoH) }
          : emptyMetrics(),
      };
    }

    const config = CHALLENGES[this.index];

    if (!face) {
      this.missedFaceFrames++;
      if (this.missedFaceFrames > FACE_MISS_GRACE_FRAMES) {
        this.alignFrames = Math.max(0, this.alignFrames - 1);
        this.turnFrames = Math.max(0, this.turnFrames - 1);
      }

      const feedback =
        this.missedFaceFrames > 4
          ? "Move your face back into the oval"
          : config.instruction;

      return {
        snapshot: this.buildSnapshot(this.lastProgress, feedback, false),
        metrics: emptyMetrics(),
      };
    }

    this.missedFaceFrames = 0;
    const metrics = { hasFace: true, ...extractMetrics(face.landmarks, face.detection.box, videoW, videoH) };

    switch (config.id) {
      case "align":
        return this.processAlign(metrics);
      case "blink":
        return this.processBlink(metrics);
      case "turn_left":
        return this.processTurn(metrics, "left");
      case "turn_right":
        return this.processTurn(metrics, "right");
      case "hold":
        return this.processHold(metrics, timestamp);
      default:
        return {
          snapshot: this.buildSnapshot(0, config.instruction, false),
          metrics,
        };
    }
  }

  private processAlign(metrics: FrameMetrics): {
    snapshot: ChallengeSnapshot;
    metrics: FrameMetrics;
  } {
    const aligned =
      metrics.centering >= ALIGN_MIN_CENTERING &&
      metrics.faceScale >= ALIGN_MIN_FACE_SCALE;

    if (aligned) {
      this.alignFrames++;
    } else {
      this.alignFrames = Math.max(0, this.alignFrames - 1);
    }

    const progress = Math.min(1, this.alignFrames / ALIGN_FRAMES_REQUIRED);
    const feedback =
      metrics.faceScale < ALIGN_MIN_FACE_SCALE
        ? "Move a little closer"
        : metrics.centering < ALIGN_MIN_CENTERING
          ? "Center your face in the oval"
          : "Perfect — hold steady";

    if (this.alignFrames >= ALIGN_FRAMES_REQUIRED) {
      this.advance();
      return {
        snapshot: this.buildSnapshot(1, "Face positioned", true),
        metrics,
      };
    }

    return {
      snapshot: this.buildSnapshot(progress, feedback, false),
      metrics,
    };
  }

  private processBlink(metrics: FrameMetrics): {
    snapshot: ChallengeSnapshot;
    metrics: FrameMetrics;
  } {
    if (this.blinkPhase === "open") {
      this.earSamples.push(metrics.ear);
      if (this.earSamples.length > 12) this.earSamples.shift();
      if (this.earSamples.length >= 3) {
        const sorted = [...this.earSamples].sort((a, b) => a - b);
        this.earBaseline = sorted[Math.floor(sorted.length / 2)];
      }
    }

    const closedThreshold = this.earBaseline * BLINK_CLOSED_RATIO;
    const openThreshold = this.earBaseline * BLINK_OPEN_RATIO;

    if (metrics.ear < closedThreshold) {
      if (this.blinkPhase === "open") this.blinkPhase = "closing";
      if (this.blinkPhase === "closing") this.blinkPhase = "closed";
    } else if (metrics.ear > openThreshold && this.blinkPhase === "closed") {
      this.advance();
      return {
        snapshot: this.buildSnapshot(1, "Blink detected", true),
        metrics,
      };
    } else if (metrics.ear > openThreshold && this.blinkPhase === "closing") {
      this.blinkPhase = "open";
    }

    const progress =
      this.blinkPhase === "closed"
        ? 0.85
        : this.blinkPhase === "closing"
          ? 0.55
          : 0.15;

    const feedback =
      this.blinkPhase === "closed"
        ? "Great — open your eyes"
        : this.blinkPhase === "closing"
          ? "Eyes closing..."
          : "Blink once, naturally";

    return {
      snapshot: this.buildSnapshot(progress, feedback, false),
      metrics,
    };
  }

  private processTurn(
    metrics: FrameMetrics,
    direction: "left" | "right",
  ): { snapshot: ChallengeSnapshot; metrics: FrameMetrics } {
    const turned =
      direction === "left"
        ? metrics.yaw > TURN_YAW_THRESHOLD
        : metrics.yaw < -TURN_YAW_THRESHOLD;

    if (turned) {
      this.turnFrames++;
    } else {
      this.turnFrames = Math.max(0, this.turnFrames - 1);
    }

    const progress = Math.min(1, this.turnFrames / TURN_FRAMES_REQUIRED);
    const feedback = turned
      ? "Hold that angle..."
      : direction === "left"
        ? "Rotate your head to the left"
        : "Rotate your head to the right";

    if (this.turnFrames >= TURN_FRAMES_REQUIRED) {
      this.advance();
      return {
        snapshot: this.buildSnapshot(1, "Movement verified", true),
        metrics,
      };
    }

    return {
      snapshot: this.buildSnapshot(progress, feedback, false),
      metrics,
    };
  }

  private processHold(
    metrics: FrameMetrics,
    timestamp: number,
  ): { snapshot: ChallengeSnapshot; metrics: FrameMetrics } {
    const steady =
      metrics.centering >= HOLD_MIN_CENTERING &&
      metrics.faceScale >= ALIGN_MIN_FACE_SCALE * 0.85;

    if (!steady) {
      this.holdStartedAt = null;
      return {
        snapshot: this.buildSnapshot(0, "Keep your face centered", false),
        metrics,
      };
    }

    if (this.holdStartedAt === null) {
      this.holdStartedAt = timestamp;
    }

    const elapsed = timestamp - this.holdStartedAt;
    const progress = Math.min(1, elapsed / HOLD_DURATION_MS);

    if (elapsed >= HOLD_DURATION_MS) {
      this.advance();
      return {
        snapshot: this.buildSnapshot(1, "Liveness confirmed", true),
        metrics,
      };
    }

    return {
      snapshot: this.buildSnapshot(
        progress,
        progress > 0.6 ? "Almost there..." : "Hold still",
        false,
      ),
      metrics,
    };
  }

  private advance(): void {
    this.index++;
    this.resetCurrentChallenge();
  }

  private resetCurrentChallenge(): void {
    this.alignFrames = 0;
    this.turnFrames = 0;
    this.blinkPhase = "open";
    this.holdStartedAt = null;
    this.earSamples = [];
    this.earBaseline = 0.28;
  }

  private buildSnapshot(
    progress: number,
    feedback: string,
    isComplete: boolean,
  ): ChallengeSnapshot {
    const config = CHALLENGES[Math.min(this.index, CHALLENGES.length - 1)];
    this.lastProgress = progress;
    return {
      id: config.id,
      index: Math.min(this.index, CHALLENGES.length - 1),
      total: CHALLENGES.length,
      progress,
      title: config.title,
      instruction: config.instruction,
      hint: config.hint,
      feedback,
      isComplete,
    };
  }
}

export function getChallengeLabel(id: ChallengeId): string {
  return CHALLENGES.find((c) => c.id === id)?.title ?? id;
}
