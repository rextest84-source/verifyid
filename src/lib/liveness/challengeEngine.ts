import {
  ALIGN_MIN_CENTERING,
  ALIGN_MIN_FACE_SCALE,
  ALIGN_PROGRESS_DECAY,
  ALIGN_PROGRESS_GAIN,
  BLINK_DROP_RATIO,
  BLINK_MIN_DROP,
  BLINK_RECOVER_RATIO,
  CHALLENGES,
  FACE_MISS_GRACE_FRAMES,
  HOLD_BREAK_GRACE_FRAMES,
  HOLD_DURATION_MS,
  HOLD_MIN_CENTERING,
  TURN_PROGRESS_DECAY,
  TURN_PROGRESS_GAIN,
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
  private alignProgress = 0;
  private turnProgress = 0;
  private holdStartedAt: number | null = null;
  private holdBreakFrames = 0;
  private missedFaceFrames = 0;
  private lastProgress = 0;
  private blinkPeakEar = 0;
  private blinkSawClose = false;
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
        snapshot: this.buildSnapshot(1, "All done — nice work!", true),
        metrics: face
          ? { hasFace: true, ...extractMetrics(face.landmarks, face.detection.box, videoW, videoH) }
          : emptyMetrics(),
      };
    }

    const config = CHALLENGES[this.index];

    if (!face) {
      this.missedFaceFrames++;
      if (this.missedFaceFrames > FACE_MISS_GRACE_FRAMES) {
        this.alignProgress = Math.max(0, this.alignProgress - ALIGN_PROGRESS_DECAY);
        this.turnProgress = Math.max(0, this.turnProgress - TURN_PROGRESS_DECAY);
      }

      const feedback =
        this.missedFaceFrames > 6
          ? "Step back into the oval — take your time"
          : "Looking for your face...";

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
      const quality = Math.min(
        1,
        (metrics.centering / ALIGN_MIN_CENTERING + metrics.faceScale / ALIGN_MIN_FACE_SCALE) / 2,
      );
      this.alignProgress = Math.min(1, this.alignProgress + ALIGN_PROGRESS_GAIN * quality);
    } else {
      this.alignProgress = Math.max(0, this.alignProgress - ALIGN_PROGRESS_DECAY);
    }

    const progress = this.alignProgress;
    let feedback: string;
    if (progress >= 0.85) {
      feedback = "Locked in — perfect!";
    } else if (progress >= 0.45) {
      feedback = "Great — hold still a moment";
    } else if (metrics.faceScale < ALIGN_MIN_FACE_SCALE) {
      feedback = "Move a little closer";
    } else if (metrics.centering < ALIGN_MIN_CENTERING) {
      feedback = "Slowly center your face in the oval";
    } else {
      feedback = "Good — keep steady";
    }

    if (this.alignProgress >= 1) {
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
          snapshot: this.buildSnapshot(1, "Blink detected — thank you!", true),
          metrics,
        };
      }
    }

    const progress = !this.blinkSawClose ? 0.15 : ear >= recoverLine * 0.85 ? 0.8 : 0.5;
    const feedback = !this.blinkSawClose
      ? "Blink once whenever you're ready"
      : ear < recoverLine
        ? "Nice — now open your eyes"
        : "Almost there...";

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
      const intensity = Math.min(1, Math.abs(metrics.yaw) / (TURN_YAW_THRESHOLD * 1.6));
      this.turnProgress = Math.min(1, this.turnProgress + TURN_PROGRESS_GAIN * intensity);
    } else {
      this.turnProgress = Math.max(0, this.turnProgress - TURN_PROGRESS_DECAY);
    }

    const progress = this.turnProgress;
    const feedback =
      progress >= 0.7
        ? "Perfect — hold that angle"
        : turned
          ? "Good turn — keep it there"
          : direction === "left"
            ? "Gently turn your head left"
            : "Gently turn your head right";

    if (this.turnProgress >= 1) {
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
      metrics.faceScale >= ALIGN_MIN_FACE_SCALE * 0.8;

    if (!steady) {
      this.holdBreakFrames++;
      if (this.holdBreakFrames > HOLD_BREAK_GRACE_FRAMES) {
        this.holdStartedAt = null;
      }
    } else {
      this.holdBreakFrames = 0;
      if (this.holdStartedAt === null) {
        this.holdStartedAt = timestamp;
      }
    }

    const elapsed = this.holdStartedAt ? timestamp - this.holdStartedAt : 0;
    const progress = Math.min(1, elapsed / HOLD_DURATION_MS);

    if (elapsed >= HOLD_DURATION_MS) {
      this.advance();
      return {
        snapshot: this.buildSnapshot(1, "Liveness confirmed!", true),
        metrics,
      };
    }

    const feedback =
      progress > 0.65
        ? "Almost done — you're doing great"
        : this.holdStartedAt
          ? "Hold steady — just a moment"
          : "Relax and look at the camera";

    return {
      snapshot: this.buildSnapshot(progress, feedback, false),
      metrics,
    };
  }

  private advance(): void {
    this.index++;
    this.resetCurrentChallenge();
  }

  private resetCurrentChallenge(): void {
    this.alignProgress = 0;
    this.turnProgress = 0;
    this.holdStartedAt = null;
    this.holdBreakFrames = 0;
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
