import {
  ALIGN_MIN_CENTERING,
  ALIGN_MIN_CENTERING_FLOOR,
  ALIGN_MIN_FACE_SCALE,
  ALIGN_MIN_SCALE_FLOOR,
  ALIGN_PROGRESS_DECAY,
  ALIGN_PROGRESS_GAIN,
  BLINK_DROP_RATIO,
  BLINK_MIN_DROP,
  BLINK_MIN_OPEN_FRAMES,
  BLINK_RECOVER_RATIO,
  CHALLENGES,
  FACE_MISS_GRACE_FRAMES,
  HOLD_BREAK_GRACE_FRAMES,
  HOLD_DURATION_MS,
  HOLD_MIN_CENTERING,
  MIN_STEP_MS,
  TURN_BASELINE_FRAMES,
  TURN_DELTA_THRESHOLD,
  TURN_PROGRESS_DECAY,
  TURN_PROGRESS_GAIN,
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
  private stepEnteredAt = 0;
  private blinkPeakEar = 0;
  private blinkOpenFrames = 0;
  private blinkSawClose = false;
  private blinkLowEar = 1;
  private turnBaselineYaw: number | null = null;
  private turnBaselineSamples: number[] = [];

  reset(): void {
    this.index = 0;
    this.stepEnteredAt = Date.now();
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

  private canAdvanceStep(stepId: ChallengeId): boolean {
    return Date.now() - this.stepEnteredAt >= MIN_STEP_MS[stepId];
  }

  private processAlign(metrics: FrameMetrics): {
    snapshot: ChallengeSnapshot;
    metrics: FrameMetrics;
  } {
    const centerScore = Math.min(1, metrics.centering / ALIGN_MIN_CENTERING);
    const scaleScore = Math.min(1, metrics.faceScale / ALIGN_MIN_FACE_SCALE);
    const combined = centerScore * 0.55 + scaleScore * 0.45;

    const inFrame =
      metrics.centering >= ALIGN_MIN_CENTERING_FLOOR &&
      metrics.faceScale >= ALIGN_MIN_SCALE_FLOOR;

    if (inFrame) {
      const gain = ALIGN_PROGRESS_GAIN * (0.3 + combined * 0.7);
      this.alignProgress = Math.min(1, this.alignProgress + gain);
    } else {
      this.alignProgress = Math.max(0, this.alignProgress - ALIGN_PROGRESS_DECAY);
    }

    const progress = this.alignProgress;
    let feedback: string;
    if (progress >= 0.85) {
      feedback = "Locked in — perfect!";
    } else if (progress >= 0.5) {
      feedback = "Scanning — hold steady...";
    } else if (progress >= 0.2) {
      feedback = "Good — keep your face in the oval";
    } else if (metrics.faceScale < ALIGN_MIN_SCALE_FLOOR) {
      feedback = "Move a little closer";
    } else if (metrics.centering < ALIGN_MIN_CENTERING_FLOOR) {
      feedback = "Slowly center your face in the oval";
    } else {
      feedback = "Scanning your face...";
    }

    if (this.alignProgress >= 1 && this.canAdvanceStep("align")) {
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
      if (ear > 0.18) {
        this.blinkOpenFrames++;
      }
    }

    const blinkArmed = this.blinkOpenFrames >= BLINK_MIN_OPEN_FRAMES;
    const closeLine = this.blinkPeakEar * BLINK_DROP_RATIO;
    const recoverLine = Math.max(
      this.blinkPeakEar * BLINK_RECOVER_RATIO,
      this.blinkLowEar + BLINK_MIN_DROP,
    );

    if (blinkArmed && !this.blinkSawClose && this.blinkPeakEar > 0.15 && ear <= closeLine) {
      this.blinkSawClose = true;
      this.blinkLowEar = ear;
    }

    if (this.blinkSawClose) {
      this.blinkLowEar = Math.min(this.blinkLowEar, ear);
      const drop = this.blinkPeakEar - this.blinkLowEar;

      if (drop >= BLINK_MIN_DROP && ear >= recoverLine && this.canAdvanceStep("blink")) {
        this.advance();
        return {
          snapshot: this.buildSnapshot(1, "Blink detected — thank you!", true),
          metrics,
        };
      }
    }

    const progress = !blinkArmed
      ? 0.1
      : !this.blinkSawClose
        ? 0.25
        : ear >= recoverLine * 0.85
          ? 0.8
          : 0.55;
    const feedback = !blinkArmed
      ? "Look at the camera with eyes open"
      : !this.blinkSawClose
        ? "Blink once whenever you're ready"
        : ear < recoverLine
          ? "Nice — now open your eyes"
          : "Almost there...";

    return {
      snapshot: this.buildSnapshot(progress, feedback, false),
      metrics,
    };
  }

  private calibrateTurnBaseline(metrics: FrameMetrics): ChallengeSnapshot | null {
    this.turnBaselineSamples.push(metrics.yaw);

    if (this.turnBaselineSamples.length < TURN_BASELINE_FRAMES) {
      return this.buildSnapshot(
        0.15 + this.turnBaselineSamples.length * 0.04,
        "Scanning — look straight ahead",
        false,
      );
    }

    this.turnBaselineYaw =
      this.turnBaselineSamples.reduce((sum, y) => sum + y, 0) /
      this.turnBaselineSamples.length;
    return null;
  }

  private processTurn(
    metrics: FrameMetrics,
    direction: "left" | "right",
  ): { snapshot: ChallengeSnapshot; metrics: FrameMetrics } {
    const stepId = direction === "left" ? "turn_left" : "turn_right";

    if (this.turnBaselineYaw === null) {
      const calibrating = this.calibrateTurnBaseline(metrics);
      if (calibrating) {
        return { snapshot: calibrating, metrics };
      }
    }

    const baseline = this.turnBaselineYaw ?? 0;
    const delta = metrics.yaw - baseline;
    const turned =
      direction === "left"
        ? delta > TURN_DELTA_THRESHOLD
        : delta < -TURN_DELTA_THRESHOLD;

    if (turned) {
      const intensity = Math.min(1, Math.abs(delta) / (TURN_DELTA_THRESHOLD * 1.5));
      this.turnProgress = Math.min(1, this.turnProgress + TURN_PROGRESS_GAIN * intensity);
    } else {
      this.turnProgress = Math.max(0, this.turnProgress - TURN_PROGRESS_DECAY);
    }

    const progress = this.turnProgress;
    const feedback =
      progress >= 0.7
        ? "Perfect — hold that angle"
        : turned
          ? "Good — keep turning slightly"
          : direction === "left"
            ? "Slowly turn your head left"
            : "Slowly turn your head right";

    if (this.turnProgress >= 1 && this.canAdvanceStep(stepId)) {
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

    if (elapsed >= HOLD_DURATION_MS && this.canAdvanceStep("hold")) {
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
    this.stepEnteredAt = Date.now();
    this.resetCurrentChallenge();
  }

  private resetCurrentChallenge(): void {
    this.alignProgress = 0;
    this.turnProgress = 0;
    this.holdStartedAt = null;
    this.holdBreakFrames = 0;
    this.blinkPeakEar = 0;
    this.blinkOpenFrames = 0;
    this.blinkSawClose = false;
    this.blinkLowEar = 1;
    this.turnBaselineYaw = null;
    this.turnBaselineSamples = [];
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
