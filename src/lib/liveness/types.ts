export type LivenessPhase =
  | "idle"
  | "loading"
  | "running"
  | "success"
  | "error";

export type ChallengeId =
  | "align"
  | "blink"
  | "turn_left"
  | "turn_right"
  | "hold";

export interface ChallengeConfig {
  id: ChallengeId;
  title: string;
  instruction: string;
  hint: string;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface FaceLandmarks {
  positions: Point2D[];
  getLeftEye(): Point2D[];
  getRightEye(): Point2D[];
  getNose(): Point2D[];
}

export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceDetectionResult {
  detection: { box: FaceBox; score: number };
  landmarks: FaceLandmarks;
}

export interface FrameMetrics {
  centering: number;
  faceScale: number;
  ear: number;
  yaw: number;
  hasFace: boolean;
}

export interface ChallengeSnapshot {
  id: ChallengeId;
  index: number;
  total: number;
  progress: number;
  title: string;
  instruction: string;
  hint: string;
  feedback: string;
  isComplete: boolean;
}

export interface RenderState {
  phase: LivenessPhase;
  challenge: ChallengeSnapshot;
  metrics: FrameMetrics;
  timestamp: number;
  face: FaceDetectionResult | null;
}
