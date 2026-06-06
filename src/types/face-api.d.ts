declare module "face-api.js" {
  interface Net {
    loadFromUri(uri: string): Promise<void>;
  }

  export const nets: {
    tinyFaceDetector: Net;
    faceLandmark68TinyNet: Net;
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

  export interface FaceLandmarks {
    positions: { x: number; y: number }[];
    getLeftEye(): { x: number; y: number }[];
    getRightEye(): { x: number; y: number }[];
    getNose(): { x: number; y: number }[];
  }

  export interface WithFaceLandmarks<T> {
    landmarks: FaceLandmarks;
  }

  interface DetectSingleFaceTask {
    withFaceLandmarks(useTinyModel?: boolean): Promise<
      | (WithFaceLandmarks<unknown> & { detection: FaceDetection })
      | undefined
    >;
  }

  export function detectSingleFace(
    input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
    options?: TinyFaceDetectorOptions,
  ): DetectSingleFaceTask;
}
