import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./constants";
import type { RenderState } from "./types";

const OVAL_RX = CANVAS_WIDTH * 0.31;
const OVAL_RY = CANVAS_HEIGHT * 0.38;

function challengeColor(progress: number, complete: boolean): string {
  if (complete) return "#4ade80";
  if (progress > 0.65) return "#38bdf8";
  if (progress > 0.3) return "#fbbf24";
  return "#94a3b8";
}

function drawMirroredVideo(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  w: number,
  h: number,
) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;

  const videoAspect = vw / vh;
  const canvasAspect = w / h;
  let sx: number;
  let sy: number;
  let sWidth: number;
  let sHeight: number;

  if (videoAspect > canvasAspect) {
    sHeight = vh;
    sWidth = vh * canvasAspect;
    sx = (vw - sWidth) / 2;
    sy = 0;
  } else {
    sWidth = vw;
    sHeight = vw / canvasAspect;
    sx = 0;
    sy = (vh - sHeight) / 2;
  }

  ctx.save();
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, w, h);
  ctx.restore();
}

function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w / 2;
  const cy = h / 2;

  ctx.save();
  ctx.fillStyle = "rgba(2, 6, 23, 0.55)";
  ctx.fillRect(0, 0, w, h);

  ctx.globalCompositeOperation = "destination-out";
  const gradient = ctx.createRadialGradient(cx, cy, OVAL_RY * 0.55, cx, cy, OVAL_RY * 1.15);
  gradient.addColorStop(0, "rgba(0,0,0,1)");
  gradient.addColorStop(0.7, "rgba(0,0,0,0.35)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(cx, cy, OVAL_RX * 1.08, OVAL_RY * 1.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  const edge = ctx.createRadialGradient(cx, cy, OVAL_RY * 0.9, cx, cy, OVAL_RY * 1.25);
  edge.addColorStop(0, "rgba(15,23,42,0)");
  edge.addColorStop(1, "rgba(2,6,23,0.75)");
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawGuideOval(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  progress: number,
  color: string,
  time: number,
) {
  const cx = w / 2;
  const cy = h / 2;
  const pulse = 0.5 + 0.5 * Math.sin(time * 0.004);

  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 18 + pulse * 10;
  ctx.strokeStyle = `${color}88`;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(cx, cy, OVAL_RX, OVAL_RY, 0, 0, Math.PI * 2);
  ctx.stroke();

  if (progress > 0) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.ellipse(
      cx,
      cy,
      OVAL_RX + 4,
      OVAL_RY + 4,
      -Math.PI / 2,
      0,
      progress * Math.PI * 2,
    );
    ctx.stroke();
  }

  ctx.setLineDash([6, 8]);
  ctx.strokeStyle = `rgba(148, 163, 184, ${0.12 + pulse * 0.08})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(cx, cy, OVAL_RX * 0.9, OVAL_RY * 0.9, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawCornerBrackets(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: string,
) {
  const cx = w / 2;
  const cy = h / 2;
  const size = OVAL_RX * 2.15;
  const len = size * 0.12;

  ctx.save();
  ctx.strokeStyle = `${color}99`;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";

  const corners: [number, number, number, number][] = [
    [cx - size / 2, cy - size / 2, 1, 1],
    [cx + size / 2, cy - size / 2, -1, 1],
    [cx - size / 2, cy + size / 2, 1, -1],
    [cx + size / 2, cy + size / 2, -1, -1],
  ];

  for (const [x, y, dx, dy] of corners) {
    ctx.beginPath();
    ctx.moveTo(x, y + dy * len);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * len, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFaceMesh(
  ctx: CanvasRenderingContext2D,
  state: RenderState,
  videoW: number,
  videoH: number,
) {
  if (!state.face || state.phase !== "running") return;

  const sx = CANVAS_WIDTH / videoW;
  const sy = CANVAS_HEIGHT / videoH;
  const cx = CANVAS_WIDTH / 2;

  ctx.save();
  for (const pt of state.face.landmarks.positions) {
    const mirroredX = CANVAS_WIDTH - pt.x * sx;
    ctx.fillStyle = "rgba(56, 189, 248, 0.45)";
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(mirroredX, pt.y * sy, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  const scanY =
    (state.face.detection.box.y + state.face.detection.box.height / 2) * sy;
  const scanOffset = (state.timestamp * 0.25) % (state.face.detection.box.height * sy);
  const y = scanY - state.face.detection.box.height * sy * 0.5 + scanOffset;

  const grad = ctx.createLinearGradient(0, y - 24, 0, y + 24);
  grad.addColorStop(0, "rgba(56, 189, 248, 0)");
  grad.addColorStop(0.5, "rgba(56, 189, 248, 0.35)");
  grad.addColorStop(1, "rgba(56, 189, 248, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(cx - OVAL_RX, y - 24, OVAL_RX * 2, 48);
  ctx.restore();
}

function drawStatusBar(ctx: CanvasRenderingContext2D, w: number, h: number, text: string) {
  ctx.save();
  const barH = 52;
  const grad = ctx.createLinearGradient(0, h - barH, 0, h);
  grad.addColorStop(0, "rgba(2, 6, 23, 0)");
  grad.addColorStop(1, "rgba(2, 6, 23, 0.9)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, h - barH, w, barH);

  ctx.font = "600 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillStyle = "#e2e8f0";
  ctx.textAlign = "center";
  ctx.fillText(text, w / 2, h - 20);
  ctx.restore();
}

export function renderLivenessFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  state: RenderState,
  videoW: number,
  videoH: number,
): void {
  const w = CANVAS_WIDTH;
  const h = CANVAS_HEIGHT;

  ctx.clearRect(0, 0, w, h);
  drawMirroredVideo(ctx, video, w, h);

  const color = challengeColor(
    state.challenge.progress,
    state.phase === "success" || state.challenge.isComplete,
  );

  drawVignette(ctx, w, h);
  drawGuideOval(ctx, w, h, state.challenge.progress, color, state.timestamp);
  drawCornerBrackets(ctx, w, h, color);
  drawFaceMesh(ctx, state, videoW, videoH);

  if (state.phase === "running") {
    drawStatusBar(ctx, w, h, state.challenge.feedback);
  } else if (state.phase === "success") {
    drawStatusBar(ctx, w, h, "Liveness verified");
  }
}
