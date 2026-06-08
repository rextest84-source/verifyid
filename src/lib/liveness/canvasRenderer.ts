import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./constants";
import { mapVideoToCanvas } from "./geometry";
import type { RenderState } from "./types";

const OVAL_RX = CANVAS_WIDTH * 0.31;
const OVAL_RY = CANVAS_HEIGHT * 0.38;

type LockPhase = "searching" | "detecting" | "locking" | "locked";

function getLockPhase(progress: number, hasFace: boolean): LockPhase {
  if (!hasFace) return "searching";
  if (progress >= 0.78) return "locked";
  if (progress >= 0.18) return "locking";
  return "detecting";
}

function lockColor(phase: LockPhase, complete: boolean): string {
  if (complete) return "#4ade80";
  switch (phase) {
    case "locked":
      return "#4ade80";
    case "locking":
      return "#38bdf8";
    case "detecting":
      return "#7dd3fc";
    default:
      return "#94a3b8";
  }
}

function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w / 2;
  const cy = h / 2;

  ctx.save();
  ctx.fillStyle = "rgba(2, 6, 23, 0.42)";
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
  phase: LockPhase,
  color: string,
) {
  const cx = w / 2;
  const cy = h / 2;
  const rx = OVAL_RX;
  const ry = OVAL_RY;

  ctx.save();

  if (phase === "locked" || phase === "locking") {
    ctx.shadowColor = color;
    ctx.shadowBlur = phase === "locked" ? 16 : 10;
  }

  ctx.strokeStyle = `${color}55`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();

  if (progress > 0) {
    ctx.strokeStyle = color;
    ctx.lineWidth = phase === "locked" ? 4 : 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx + 2, ry + 2, -Math.PI / 2, 0, progress * Math.PI * 2);
    ctx.stroke();
  }

  if (phase === "locked") {
    ctx.fillStyle = "rgba(74, 222, 128, 0.12)";
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawScanLine(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  timestamp: number,
) {
  const scanRange = ry * 1.6;
  const scanY = cy - scanRange / 2 + ((timestamp * 0.12) % scanRange);

  ctx.save();
  const grad = ctx.createLinearGradient(0, scanY - 18, 0, scanY + 18);
  grad.addColorStop(0, "rgba(56, 189, 248, 0)");
  grad.addColorStop(0.5, "rgba(56, 189, 248, 0.4)");
  grad.addColorStop(1, "rgba(56, 189, 248, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(cx - rx, scanY - 18, rx * 2, 36);
  ctx.restore();
}

function shouldShowScan(state: RenderState, lockPhase: LockPhase): boolean {
  if (state.phase !== "running" || lockPhase === "locked") return false;
  const id = state.challenge.id;
  return id === "align" || id === "turn_left" || id === "turn_right" || id === "blink";
}

function drawFaceGuidance(
  ctx: CanvasRenderingContext2D,
  state: RenderState,
  videoW: number,
  videoH: number,
  lockPhase: LockPhase,
) {
  if (!state.face || state.phase !== "running") return;

  const box = state.face.detection.box;
  const tl = mapVideoToCanvas(box.x, box.y, videoW, videoH);
  const br = mapVideoToCanvas(box.x + box.width, box.y + box.height, videoW, videoH);
  const x = Math.min(tl.x, br.x);
  const y = Math.min(tl.y, br.y);
  const bw = Math.abs(br.x - tl.x);
  const bh = Math.abs(br.y - tl.y);
  const faceCx = (tl.x + br.x) / 2;
  const faceCy = (tl.y + br.y) / 2;

  if (shouldShowScan(state, lockPhase)) {
    drawScanLine(ctx, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, OVAL_RX, OVAL_RY, state.timestamp);
  }

  if (lockPhase === "locking" || lockPhase === "locked") {
    const corner = 14;
    const inset = 4;
    ctx.save();
    ctx.strokeStyle =
      lockPhase === "locked" ? "rgba(74, 222, 128, 0.75)" : "rgba(56, 189, 248, 0.55)";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";

    const corners: [number, number, number, number][] = [
      [x + inset, y + inset + corner, x + inset, y + inset, x + inset + corner, y + inset],
      [x + bw - inset - corner, y + inset, x + bw - inset, y + inset, x + bw - inset, y + inset + corner],
      [x + inset, y + bh - inset - corner, x + inset, y + bh - inset, x + inset + corner, y + bh - inset],
      [x + bw - inset - corner, y + bh - inset, x + bw - inset, y + bh - inset, x + bw - inset, y + bh - inset - corner],
    ];

    for (const [x1, y1, x2, y2, x3, y3] of corners) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (state.metrics.hasFace && state.metrics.centering < 0.45 && lockPhase !== "locked") {
    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2;
    const dx = cx - faceCx;
    const dy = cy - faceCy;
    const len = Math.hypot(dx, dy) || 1;
    const ax = faceCx + (dx / len) * 24;
    const ay = faceCy + (dy / len) * 24;

    ctx.save();
    ctx.fillStyle = "rgba(125, 211, 252, 0.85)";
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax - (dx / len) * 8 - (dy / len) * 4, ay - (dy / len) * 8 + (dx / len) * 4);
    ctx.lineTo(ax - (dx / len) * 8 + (dy / len) * 4, ay - (dy / len) * 8 - (dx / len) * 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawLockBadge(ctx: CanvasRenderingContext2D, w: number, lockPhase: LockPhase) {
  const labels: Record<LockPhase, string> = {
    searching: "Looking for you",
    detecting: "Scanning face",
    locking: "Locking in",
    locked: "Locked in",
  };

  const label = labels[lockPhase];
  const badgeColor =
    lockPhase === "locked"
      ? "rgba(74, 222, 128, 0.2)"
      : lockPhase === "locking"
        ? "rgba(56, 189, 248, 0.18)"
        : "rgba(15, 23, 42, 0.72)";

  ctx.save();
  const badgeW = 148;
  const badgeH = 26;
  const bx = (w - badgeW) / 2;
  const by = 14;

  ctx.fillStyle = badgeColor;
  ctx.strokeStyle =
    lockPhase === "locked"
      ? "rgba(74, 222, 128, 0.45)"
      : "rgba(148, 163, 184, 0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(bx, by, badgeW, badgeH, 13);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = lockPhase === "locked" ? "#4ade80" : "#38bdf8";
  ctx.beginPath();
  ctx.arc(bx + 12, by + badgeH / 2, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = "600 11px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = lockPhase === "locked" ? "#bbf7d0" : "#e2e8f0";
  ctx.textAlign = "center";
  ctx.fillText(label, w / 2 + 6, by + 17);
  ctx.restore();
}

function drawStatusBar(ctx: CanvasRenderingContext2D, w: number, h: number, text: string) {
  ctx.save();
  const barH = 44;
  const grad = ctx.createLinearGradient(0, h - barH, 0, h);
  grad.addColorStop(0, "rgba(2, 6, 23, 0)");
  grad.addColorStop(1, "rgba(2, 6, 23, 0.88)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, h - barH, w, barH);

  ctx.font = "500 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillStyle = "#cbd5e1";
  ctx.textAlign = "center";
  ctx.fillText(text, w / 2, h - 16);
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
  const complete = state.phase === "success" || state.challenge.isComplete;
  const lockPhase = getLockPhase(state.challenge.progress, state.metrics.hasFace);
  const color = lockColor(lockPhase, complete);

  ctx.clearRect(0, 0, w, h);

  drawVignette(ctx, w, h);
  drawGuideOval(ctx, w, h, state.challenge.progress, lockPhase, color);
  drawFaceGuidance(ctx, state, videoW, videoH, lockPhase);

  if (state.phase === "running") {
    drawLockBadge(ctx, w, lockPhase);
    drawStatusBar(ctx, w, h, state.challenge.feedback);
  } else if (state.phase === "success") {
    drawStatusBar(ctx, w, h, "Liveness verified — thank you!");
  }
}
