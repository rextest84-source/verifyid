declare module 'face-api.js' {
  export const nets: {
    tinyFaceDetector: {
      load(uri: string): Promise<void>;
    };
    faceLandmark68TinyNet: {
      load(uri: string): Promise<void>;
    };
  };

  export class TinyFaceDetectorOptions {
    constructor(options?: { inputSize?: number; scoreThreshold?: number });
  }

  export interface FaceDetection {
    box: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    score: number;
  }

  export interface WithFaceDetection<T> {
    detection: FaceDetection;
  }

  export interface WithFaceLandmarks<T> {
    landmarks: {
      positions: { x: number; y: number }[];
      getLeftEye(): { x: number; y: number }[];
      getRightEye(): { x: number; y: number }[];
      getNose(): { x: number; y: number }[];
    };
  }

  interface DetectFaceLandmarksTask<TResult> {
    withFaceLandmarks(useTinyModel?: boolean): TResult;
  }

  export function detectSingleFace(
    input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
    options?: TinyFaceDetectorOptions
  ): any;

  export const draw: {
    drawDetections(canvas: HTMLCanvasElement, detections: FaceDetection | FaceDetection[]): void;
    drawFaceLandmarks(canvas: HTMLCanvasElement, landmarks: any): void;
  };
}
