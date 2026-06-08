import {
  ALIGN_FRAMES_REQUIRED,
  ALIGN_MIN_CENTERING,
  ALIGN_MIN_FACE_SCALE,
  BLINK_DROP_RATIO,
  BLINK_MIN_DROP,
  BLINK_RECOVER_RATIO,
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

export class LivenessChallengeEngine {
  private index = 0;
  private alignFrames = 0;
  private turnFrames = 0;
  private holdStartedAt: number | null = null;
  private missedFaceFrames = 0;
  private lastProgress = 0;
  /** Peak open-eye EAR while waiting for a blink. */
  private blinkPeakEar = 0;
  /** True once eyes drop below the blink threshold. */
  private blinkSawClose = false;
  /** Lowest EAR seen during the current blink attempt. */
  private blinkLowEar = 1;

  reset(): void {
    this.index = 0;
    this.resetCurrentChallenge();
    this.missedFaceFrames = 0;
    this.lastProgress = 0;
  }

  get isComplete(): boolean {
    return this.index >= CHALLENGES.length;
  }

  get currentChallengeId(): ChallengeId {
    return CHALLENGES[Math.min(this.index, CHALLENGES.length - 1)].id;
  }

  /** Smooth hold progress between detection frames (call from rAF). */
  getHoldProgress(now: number): number {
    if (this.holdStartedAt === null) return 0;
    return Math.min(1, (now - this.holdStartedAt) / HOLD_DURATION_MS);
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
    const ear = metrics.ear;

    if (!this.blinkSawClose) {
      this.blinkPeakEar = Math.max(this.blinkPeakEar, ear);
    }

    const closeLine = this.blinkPeakEar * BLINK_DROP_RATIO;
    const recoverLine = Math.max(
      this.blinkPeakEar * BLINK_RECOVER_RATIO,
      this.blinkLowEar + BLINK_MIN_DROP,
    );

    if (!this.blinkSawClose && this.blinkPeakEar > 0.1 && ear <= closeLine) {
      this.blinkSawClose = true;
      this.blinkLowEar = ear;
    }

    if (this.blinkSawClose) {
      this.blinkLowEar = Math.min(this.blinkLowEar, ear);
      const drop = this.blinkPeakEar - this.blinkLowEar;

      if (drop >= BLINK_MIN_DROP && ear >= recoverLine) {
        this.advance();
        return {
          snapshot: this.buildSnapshot(1, "Blink detected", true),
          metrics,
        };
      }
    }

    const progress = !this.blinkSawClose ? 0.2 : ear >= recoverLine * 0.85 ? 0.75 : 0.55;
    const feedback = !this.blinkSawClose
      ? "Close your eyes briefly"
      : ear < recoverLine
        ? "Good — now open your eyes"
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
    this.holdStartedAt = null;
    this.blinkPeakEar = 0;
    this.blinkSawClose = false;
    this.blinkLowEar = 1;
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
