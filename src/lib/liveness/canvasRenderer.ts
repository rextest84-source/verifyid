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

function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w / 2;
  const cy = h / 2;

  ctx.save();
  ctx.fillStyle = "rgba(2, 6, 23, 0.5)";
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.ellipse(cx, cy, OVAL_RX * 1.08, OVAL_RY * 1.08, 0, 0, Math.PI * 2);
  ctx.fill("evenodd");
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
  const pulse = 0.5 + 0.5 * Math.sin(time * 0.008);

  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 14 + pulse * 8;
  ctx.strokeStyle = `${color}99`;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(cx, cy, OVAL_RX, OVAL_RY, 0, 0, Math.PI * 2);
  ctx.stroke();

  if (progress > 0) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.ellipse(cx, cy, OVAL_RX + 3, OVAL_RY + 3, -Math.PI / 2, 0, progress * Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFaceTracking(
  ctx: CanvasRenderingContext2D,
  state: RenderState,
  videoW: number,
  videoH: number,
) {
  if (!state.face || state.phase !== "running") return;

  const box = state.face.detection.box;
  const tl = mapVideoToCanvas(box.x, box.y, videoW, videoH);
  const br = mapVideoToCanvas(box.x + box.width, box.y + box.height, videoW, videoH);
  const x = Math.min(tl.x, br.x);
  const y = Math.min(tl.y, br.y);
  const bw = Math.abs(br.x - tl.x);
  const bh = Math.abs(br.y - tl.y);

  ctx.save();
  ctx.strokeStyle = "rgba(56, 189, 248, 0.55)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(x, y, bw, bh);
  ctx.restore();

  const cx = CANVAS_WIDTH / 2;
  const scanSpeed = 0.45;
  const scanOffset = (state.timestamp * scanSpeed) % bh;
  const scanY = y + scanOffset;

  ctx.save();
  const grad = ctx.createLinearGradient(0, scanY - 20, 0, scanY + 20);
  grad.addColorStop(0, "rgba(56, 189, 248, 0)");
  grad.addColorStop(0.5, "rgba(56, 189, 248, 0.5)");
  grad.addColorStop(1, "rgba(56, 189, 248, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(x, scanY - 20, bw, 40);
  ctx.restore();

  if (state.metrics.hasFace && state.metrics.centering < 0.5) {
    const faceCx = (tl.x + br.x) / 2;
    const faceCy = (tl.y + br.y) / 2;
    const dx = cx - faceCx;
    const dy = CANVAS_HEIGHT / 2 - faceCy;
    const len = Math.hypot(dx, dy) || 1;
    const ax = faceCx + (dx / len) * 28;
    const ay = faceCy + (dy / len) * 28;

    ctx.save();
    ctx.fillStyle = "rgba(251, 191, 36, 0.9)";
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax - (dx / len) * 10 - (dy / len) * 5, ay - (dy / len) * 10 + (dx / len) * 5);
    ctx.lineTo(ax - (dx / len) * 10 + (dy / len) * 5, ay - (dy / len) * 10 - (dx / len) * 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawSensorHud(ctx: CanvasRenderingContext2D, state: RenderState) {
  const { sensors, challenge } = state;
  const bars: { label: string; value: number; color: string }[] = [
    { label: "CTR", value: sensors.centering, color: "#38bdf8" },
    { label: "SCL", value: sensors.faceScale, color: "#22d3ee" },
  ];

  if (challenge.id === "blink") {
    bars.push({ label: "EYE", value: Math.min(1, sensors.ear / 0.35), color: "#a78bfa" });
  }
  if (challenge.id === "turn_left" || challenge.id === "turn_right") {
    bars.push({
      label: "YAW",
      value: Math.min(1, Math.abs(sensors.yaw) / 0.25),
      color: "#f472b6",
    });
  }

  const x0 = 10;
  let y = 52;
  const barW = 4;
  const barH = 36;

  ctx.save();
  ctx.font = "600 8px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textAlign = "left";

  for (const bar of bars) {
    ctx.fillStyle = "rgba(15, 23, 42, 0.65)";
    ctx.fillRect(x0, y, barW, barH);
    ctx.fillStyle = bar.color;
    ctx.fillRect(x0, y + barH * (1 - bar.value), barW, barH * bar.value);
    ctx.fillStyle = "rgba(226, 232, 240, 0.7)";
    ctx.fillText(bar.label, x0 + 7, y + barH - 4);
    y += barH + 8;
  }

  const scanColor = sensors.isScanning ? "#4ade80" : sensors.faceDetected ? "#38bdf8" : "#64748b";
  ctx.fillStyle = scanColor;
  ctx.beginPath();
  ctx.arc(x0 + 2, 36, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(226, 232, 240, 0.8)";
  ctx.font = "700 9px -apple-system, sans-serif";
  ctx.fillText(`${sensors.detectionsPerSec}/s`, x0 + 8, 39);

  ctx.restore();
}

function drawStatusBar(ctx: CanvasRenderingContext2D, w: number, h: number, text: string) {
  ctx.save();
  const barH = 48;
  const grad = ctx.createLinearGradient(0, h - barH, 0, h);
  grad.addColorStop(0, "rgba(2, 6, 23, 0)");
  grad.addColorStop(1, "rgba(2, 6, 23, 0.92)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, h - barH, w, barH);

  ctx.font = "600 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillStyle = "#e2e8f0";
  ctx.textAlign = "center";
  ctx.fillText(text, w / 2, h - 18);
  ctx.restore();
}

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
  drawFaceTracking(ctx, state, videoW, videoH);
  drawSensorHud(ctx, state);

  if (state.phase === "running") {
    drawStatusBar(ctx, w, h, state.challenge.feedback);
  } else if (state.phase === "success") {
    drawStatusBar(ctx, w, h, "Liveness verified");
  }
}
