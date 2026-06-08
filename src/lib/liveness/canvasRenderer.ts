import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./constants";
import { mapVideoToCanvas } from "./geometry";
import type { RenderState } from "./types";

const OVAL_RX = CANVAS_WIDTH * 0.31;
const OVAL_RY = CANVAS_HEIGHT * 0.38;

function challengeColor(progress: number, complete: boolean): string {
  if (complete) return "#4ade80";
  if (progress > 0.65) return "#38bdf8";
  if (progress > 0.3) return "#fbbf24";
  return "#94a3b8";
}

/** Darken edges; transparent oval center lets the HTML video layer show through. */
function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w / 2;
  const cy = h / 2;

  ctx.save();
  ctx.fillStyle = "rgba(2, 6, 23, 0.55)";
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.ellipse(cx, cy, OVAL_RX * 1.08, OVAL_RY * 1.08, 0, 0, Math.PI * 2);
  ctx.fill("evenodd");
  ctx.restore();

  ctx.save();
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

  const cx = CANVAS_WIDTH / 2;

  ctx.save();
  for (const pt of state.face.landmarks.positions) {
    const mapped = mapVideoToCanvas(pt.x, pt.y, videoW, videoH);
    ctx.fillStyle = "rgba(56, 189, 248, 0.45)";
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(mapped.x, mapped.y, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  const box = state.face.detection.box;
  const topLeft = mapVideoToCanvas(box.x, box.y, videoW, videoH);
  const bottomRight = mapVideoToCanvas(
    box.x + box.width,
    box.y + box.height,
    videoW,
    videoH,
  );
  const boxHeight = Math.abs(bottomRight.y - topLeft.y);
  const scanY = (topLeft.y + bottomRight.y) / 2;
  const scanOffset = (state.timestamp * 0.25) % boxHeight;
  const y = scanY - boxHeight * 0.5 + scanOffset;

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

/** Draw UI overlays only — the live camera feed is an HTML video element beneath. */
export function renderLivenessFrame(
  ctx: CanvasRenderingContext2D,
  state: RenderState,
  videoW: number,
  videoH: number,
): void {
  const w = CANVAS_WIDTH;
  const h = CANVAS_HEIGHT;

  ctx.clearRect(0, 0, w, h);

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
