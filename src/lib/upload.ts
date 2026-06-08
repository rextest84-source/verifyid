import { apiUrl } from "@/lib/api";
import { shouldMirrorSelfiePreview } from "@/lib/liveness/previewMirror";

export async function uploadImageFile(file: Blob, filename: string): Promise<string | null> {
  const formData = new FormData();
  formData.append("file", file, filename);

  const res = await fetch(apiUrl("/api/upload"), {
    method: "POST",
    body: formData,
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { url?: string };
  return data.url ?? null;
}

export async function captureVideoFrame(video: HTMLVideoElement): Promise<Blob | null> {
  if (!video.videoWidth || !video.videoHeight) return null;

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  if (shouldMirrorSelfiePreview()) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
  });
}
