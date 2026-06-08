import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./constants";
import { mapVideoToCanvas } from "./geometry";
import type { RenderState } from "./types";

const OVAL_RX = CANVAS_WIDTH * 0.31;
const OVAL_RY = CANVAS_HEIGHT * 0.38;

type LockPhase = "searching" | "detecting" | "locking" | "locked";

function getLockPhase(progress: number, hasFace: boolean): LockPhase {
  if (!hasFace) return "searching";
  if (progress >= 0.55) return "locked";
  if (progress >= 0.08) return "locking";
  return "detecting";
}

function lockColor(phase: LockPhase, complete: boolean): string {
  if (complete) return "#34d399";
  switch (phase) {
    case "locked":
      return "#34d399";
    case "locking":
      return "#a78bfa";
    case "detecting":
      return "#c4b5fd";
    default:
      return "#94a3b8";
  }
}

function getVideoCrop(videoW: number, videoH: number, canvasW: number, canvasH: number) {
  const videoAspect = videoW / videoH;
  const canvasAspect = canvasW / canvasH;

  if (videoAspect > canvasAspect) {
    const sh = videoH;
    const sw = videoH * canvasAspect;
    return { sx: (videoW - sw) / 2, sy: 0, sw, sh };
  }

  const sw = videoW;
  const sh = videoW / canvasAspect;
  return { sx: 0, sy: (videoH - sh) / 2, sw, sh };
}

/** Draw the live camera feed mirrored (selfie mode) into the canvas. */
function drawMirroredVideo(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  w: number,
  h: number,
) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;

  const { sx, sy, sw, sh } = getVideoCrop(vw, vh, w, h);

  ctx.save();
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);
  ctx.restore();
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

function drawScanGrid(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(167, 139, 250, 0.12)";
  ctx.lineWidth = 1;

  const spacing = 28;
  const offset = (t * 0.04) % spacing;

  for (let x = cx - OVAL_RX; x <= cx + OVAL_RX; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x + offset, cy - OVAL_RY);
    ctx.lineTo(x + offset, cy + OVAL_RY);
    ctx.stroke();
  }

  for (let y = cy - OVAL_RY; y <= cy + OVAL_RY; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(cx - OVAL_RX, y + offset);
    ctx.lineTo(cx + OVAL_RX, y + offset);
    ctx.stroke();
  }

  ctx.restore();
}

function drawPulseRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  t: number,
  color: string,
) {
  const pulse = 0.5 + 0.5 * Math.sin(t * 0.004);
  const expand = 1 + pulse * 0.06;

  ctx.save();
  ctx.globalAlpha = 0.25 + pulse * 0.2;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * expand, ry * expand, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawScanLine(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  timestamp: number,
  vertical = false,
) {
  const scanRange = vertical ? rx * 1.6 : ry * 1.6;
  const pos = vertical
    ? cx - scanRange / 2 + ((timestamp * 0.1) % scanRange)
    : cy - scanRange / 2 + ((timestamp * 0.12) % scanRange);

  ctx.save();
  if (vertical) {
    const grad = ctx.createLinearGradient(pos - 18, 0, pos + 18, 0);
    grad.addColorStop(0, "rgba(167, 139, 250, 0)");
    grad.addColorStop(0.5, "rgba(167, 139, 250, 0.55)");
    grad.addColorStop(1, "rgba(167, 139, 250, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(pos - 18, cy - ry, 36, ry * 2);
  } else {
    const grad = ctx.createLinearGradient(0, pos - 18, 0, pos + 18);
    grad.addColorStop(0, "rgba(167, 139, 250, 0)");
    grad.addColorStop(0.5, "rgba(167, 139, 250, 0.55)");
    grad.addColorStop(1, "rgba(167, 139, 250, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(cx - rx, pos - 18, rx * 2, 36);
  }
  ctx.restore();
}

function drawCornerBrackets(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: string,
  t: number,
) {
  const len = 22;
  const inset = 6;
  const pulse = 0.7 + 0.3 * Math.sin(t * 0.005);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.globalAlpha = pulse;

  const corners: [number, number, number, number, number, number][] = [
    [cx - rx + inset, cy - ry + inset + len, cx - rx + inset, cy - ry + inset, cx - rx + inset + len, cy - ry + inset],
    [cx + rx - inset - len, cy - ry + inset, cx + rx - inset, cy - ry + inset, cx + rx - inset, cy - ry + inset + len],
    [cx - rx + inset, cy + ry - inset - len, cx - rx + inset, cy + ry - inset, cx - rx + inset + len, cy + ry - inset],
    [cx + rx - inset - len, cy + ry - inset, cx + rx - inset, cy + ry - inset, cx + rx - inset, cy + ry - inset - len],
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

function drawGuideOval(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  progress: number,
  phase: LockPhase,
  color: string,
  t: number,
) {
  const cx = w / 2;
  const cy = h / 2;
  const rx = OVAL_RX;
  const ry = OVAL_RY;

  ctx.save();

  if (phase !== "searching") {
    drawScanGrid(ctx, cx, cy, t);
    drawPulseRing(ctx, cx, cy, rx, ry, t, color);
  }

  if (phase === "locked" || phase === "locking") {
    ctx.shadowColor = color;
    ctx.shadowBlur = phase === "locked" ? 20 : 12;
  }

  ctx.strokeStyle = `${color}44`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();

  if (progress > 0) {
    ctx.strokeStyle = color;
    ctx.lineWidth = phase === "locked" ? 5 : 3.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx + 2, ry + 2, -Math.PI / 2, 0, progress * Math.PI * 2);
    ctx.stroke();
  }

  if (phase === "locked") {
    ctx.fillStyle = "rgba(52, 211, 153, 0.14)";
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (phase === "detecting" || phase === "locking") {
    drawCornerBrackets(ctx, cx, cy, rx, ry, color, t);
  }

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
  mirrorPreview: boolean,
) {
  if (!state.face || state.phase !== "running") return;

  const box = state.face.detection.box;
  const tl = mapVideoToCanvas(box.x, box.y, videoW, videoH, CANVAS_WIDTH, CANVAS_HEIGHT, mirrorPreview);
  const br = mapVideoToCanvas(
    box.x + box.width,
    box.y + box.height,
    videoW,
    videoH,
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    mirrorPreview,
  );
  const x = Math.min(tl.x, br.x);
  const y = Math.min(tl.y, br.y);
  const bw = Math.abs(br.x - tl.x);
  const bh = Math.abs(br.y - tl.y);
  const faceCx = (tl.x + br.x) / 2;
  const faceCy = (tl.y + br.y) / 2;

  if (shouldShowScan(state, lockPhase)) {
    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2;
    drawScanLine(ctx, cx, cy, OVAL_RX, OVAL_RY, state.timestamp, false);
    drawScanLine(ctx, cx, cy, OVAL_RX, OVAL_RY, state.timestamp * 0.85 + 400, true);
  }

  if (lockPhase === "locking" || lockPhase === "locked") {
    const corner = 14;
    const inset = 4;
    ctx.save();
    ctx.strokeStyle =
      lockPhase === "locked" ? "rgba(52, 211, 153, 0.85)" : "rgba(167, 139, 250, 0.65)";
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

  if (state.metrics.hasFace && state.metrics.centering < 0.35 && lockPhase !== "locked") {
    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2;
    const dx = cx - faceCx;
    const dy = cy - faceCy;
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

function drawLockBadge(
  ctx: CanvasRenderingContext2D,
  w: number,
  lockPhase: LockPhase,
  progress: number,
) {
  const labels: Record<LockPhase, string> = {
    searching: "Looking for you",
    detecting: "Scanning face",
    locking: "Locking in",
    locked: "Locked in",
  };

  const label = labels[lockPhase];
  const pct = lockPhase === "locked" ? 100 : Math.round(progress * 100);
  const badgeColor =
    lockPhase === "locked"
      ? "rgba(52, 211, 153, 0.22)"
      : lockPhase === "locking"
        ? "rgba(167, 139, 250, 0.2)"
        : "rgba(15, 23, 42, 0.78)";

  ctx.save();
  const badgeW = 168;
  const badgeH = 28;
  const bx = (w - badgeW) / 2;
  const by = 12;

  ctx.fillStyle = badgeColor;
  ctx.strokeStyle =
    lockPhase === "locked"
      ? "rgba(52, 211, 153, 0.5)"
      : "rgba(167, 139, 250, 0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(bx, by, badgeW, badgeH, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = lockPhase === "locked" ? "#34d399" : "#a78bfa";
  ctx.beginPath();
  ctx.arc(bx + 13, by + badgeH / 2, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = "600 11px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = lockPhase === "locked" ? "#bbf7d0" : "#e2e8f0";
  ctx.textAlign = "center";
  ctx.fillText(`${label} · ${pct}%`, w / 2 + 4, by + 18);
  ctx.restore();
}

function drawTurnArrow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  direction: "left" | "right",
  progress: number,
) {
  const offsetX = direction === "left" ? -OVAL_RX * 0.72 : OVAL_RX * 0.72;
  const ax = cx + offsetX;
  const ay = cy;
  const pulse = 0.85 + Math.sin(Date.now() * 0.006) * 0.15;
  const alpha = 0.55 + progress * 0.45;

  ctx.save();
  ctx.globalAlpha = alpha * pulse;

  const grad = ctx.createRadialGradient(ax, ay, 0, ax, ay, 36);
  grad.addColorStop(0, "rgba(167, 139, 250, 0.45)");
  grad.addColorStop(1, "rgba(167, 139, 250, 0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(ax, ay, 36, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = progress >= 0.7 ? "#34d399" : "#a78bfa";
  ctx.fillStyle = progress >= 0.7 ? "#34d399" : "#c4b5fd";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const dir = direction === "left" ? -1 : 1;
  const tipX = ax + dir * 18;
  const tailX = ax - dir * 10;

  ctx.beginPath();
  ctx.moveTo(tailX, ay);
  ctx.lineTo(tipX, ay);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(tipX, ay);
  ctx.lineTo(tipX - dir * 10, ay - 8);
  ctx.lineTo(tipX - dir * 10, ay + 8);
  ctx.closePath();
  ctx.fill();

  ctx.font = "600 10px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#e2e8f0";
  ctx.fillText(direction === "left" ? "LEFT" : "RIGHT", ax, ay + 34);

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

  ctx.font = "500 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillStyle = "#e2e8f0";
  ctx.textAlign = "center";
  ctx.fillText(text, w / 2, h - 16);
  ctx.restore();
}

export function renderLivenessFrame(
  ctx: CanvasRenderingContext2D,
  state: RenderState,
  video: HTMLVideoElement,
  mirrorPreview = true,
): void {
  const w = CANVAS_WIDTH;
  const h = CANVAS_HEIGHT;
  const videoW = video.videoWidth;
  const videoH = video.videoHeight;
  const complete = state.phase === "success" || state.challenge.isComplete;
  const lockPhase = getLockPhase(state.challenge.progress, state.metrics.hasFace);
  const color = lockColor(lockPhase, complete);

  ctx.clearRect(0, 0, w, h);

  drawMirroredVideo(ctx, video, w, h);
  drawVignette(ctx, w, h);
  drawGuideOval(ctx, w, h, state.challenge.progress, lockPhase, color, state.timestamp);
  drawFaceGuidance(ctx, state, videoW, videoH, lockPhase, mirrorPreview);

  if (state.phase === "running") {
    const cx = w / 2;
    const cy = h / 2;
    if (state.challenge.id === "turn_left") {
      drawTurnArrow(ctx, cx, cy, "left", state.challenge.progress);
    } else if (state.challenge.id === "turn_right") {
      drawTurnArrow(ctx, cx, cy, "right", state.challenge.progress);
    }
  }

  if (state.phase === "running") {
    drawLockBadge(ctx, w, lockPhase, state.challenge.progress);
    drawStatusBar(ctx, w, h, state.challenge.feedback);
  } else if (state.phase === "success") {
    drawStatusBar(ctx, w, h, "Liveness verified — thank you!");
  }
}
