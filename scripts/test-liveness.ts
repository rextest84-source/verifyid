/**
 * Liveness challenge engine + geometry integration tests.
 * Run: npm run test:liveness
 */
import { LivenessChallengeEngine } from "../src/lib/liveness/challengeEngine.ts";
import {
  ALIGN_MIN_CENTERING_FLOOR,
  ALIGN_MIN_SCALE_FLOOR,
  HOLD_DURATION_MS,
  TURN_BASELINE_FRAMES,
  TURN_DELTA_THRESHOLD,
} from "../src/lib/liveness/constants.ts";
import { computeYaw, extractMetrics } from "../src/lib/liveness/geometry.ts";
import {
  isMobileLikeDevice,
  shouldFlipDetectionFrame,
  shouldMirrorSelfiePreview,
} from "../src/lib/liveness/previewMirror.ts";
import type { ChallengeId, FaceDetectionResult, FaceLandmarks, Point2D } from "../src/lib/liveness/types.ts";

let passed = 0;
let failed = 0;
let fakeNow = 1_000_000;
const realDateNow = Date.now;

function assert(name: string, condition: boolean) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}`);
  }
}

function useFakeTime() {
  fakeNow = 1_000_000;
  Date.now = () => fakeNow;
}

function restoreTime() {
  Date.now = realDateNow;
}

function advanceTime(ms: number) {
  fakeNow += ms;
}

function makeEye(cx: number, cy: number, open: boolean): Point2D[] {
  const gap = open ? 6 : 1;
  return [
    { x: cx - 20, y: cy },
    { x: cx - 10, y: cy - gap },
    { x: cx, y: cy - gap },
    { x: cx + 20, y: cy },
    { x: cx, y: cy + gap },
    { x: cx - 10, y: cy + gap },
  ];
}

function makeLandmarks(noseX: number, centerX: number, earOpen = true): FaceLandmarks {
  const cy = 200;
  return {
    positions: [],
    getNose: () => [{ x: noseX, y: cy + 20 }],
    getLeftEye: () => makeEye(centerX - 40, cy - 10, earOpen),
    getRightEye: () => makeEye(centerX + 40, cy - 10, earOpen),
  };
}

function makeFace(noseX: number, videoW = 640, earOpen = true): FaceDetectionResult {
  const boxW = 160;
  const centerX = videoW / 2;
  return {
    detection: {
      box: { x: centerX - boxW / 2, y: 120, width: boxW, height: 200 },
      score: 0.95,
    },
    landmarks: makeLandmarks(noseX, centerX, earOpen),
  };
}

function tick(engine: LivenessChallengeEngine, face: FaceDetectionResult | null, ms = 40) {
  advanceTime(ms);
  return engine.process(face, 640, 480, Date.now());
}

function completeAlign(engine: LivenessChallengeEngine, face: FaceDetectionResult) {
  for (let i = 0; i < 80 && engine.currentChallengeId === "align"; i++) {
    tick(engine, face);
  }
}

function completeBlink(engine: LivenessChallengeEngine, open: FaceDetectionResult, closed: FaceDetectionResult) {
  for (let i = 0; i < 12 && engine.currentChallengeId === "blink"; i++) {
    tick(engine, open);
  }
  tick(engine, closed);
  for (let i = 0; i < 30 && engine.currentChallengeId === "blink"; i++) {
    tick(engine, open);
  }
}

function advanceTo(engine: LivenessChallengeEngine, target: ChallengeId, open: FaceDetectionResult, closed: FaceDetectionResult) {
  const order: ChallengeId[] = ["align", "blink", "turn_left", "turn_right", "hold"];
  const targetIdx = order.indexOf(target);

  if (targetIdx >= 1) completeAlign(engine, open);
  if (targetIdx >= 2) completeBlink(engine, open, closed);

  if (targetIdx >= 3) {
    const left = makeFace(320 - TURN_DELTA_THRESHOLD * 80 * 1.5);
    for (let i = 0; i < TURN_BASELINE_FRAMES; i++) tick(engine, open);
    for (let i = 0; i < 50 && engine.currentChallengeId === "turn_left"; i++) tick(engine, left);
  }

  if (targetIdx >= 4) {
    const right = makeFace(320 + TURN_DELTA_THRESHOLD * 80 * 1.5);
    for (let i = 0; i < TURN_BASELINE_FRAMES; i++) tick(engine, open);
    for (let i = 0; i < 50 && engine.currentChallengeId === "turn_right"; i++) tick(engine, right);
  }

  return engine.currentChallengeId === target;
}

useFakeTime();

const CENTER = 320;
const open = makeFace(CENTER, 640, true);
const closed = makeFace(CENTER, 640, false);

console.log("Geometry tests\n");
const box = open.detection.box;
assert("display-space left turn → positive yaw", computeYaw(makeLandmarks(260, CENTER), box) > 0.3);
assert("display-space right turn → negative yaw", computeYaw(makeLandmarks(380, CENTER), box) < -0.3);

console.log("\nPreview mirror tests\n");
assert("preview is always mirrored", shouldMirrorSelfiePreview() === true);
assert("detection flip matches device class", shouldFlipDetectionFrame() === !isMobileLikeDevice());

console.log("\nChallenge engine — align\n");
{
  const engine = new LivenessChallengeEngine();
  completeAlign(engine, open);
  assert("align completes with centered face", engine.currentChallengeId === "blink");
}

console.log("\nChallenge engine — turn left\n");
{
  const engine = new LivenessChallengeEngine();
  const reached = advanceTo(engine, "turn_left", open, closed);
  assert("engine reaches turn_left", reached);

  const left = makeFace(CENTER - TURN_DELTA_THRESHOLD * 80 * 1.5);
  for (let i = 0; i < TURN_BASELINE_FRAMES; i++) tick(engine, open);

  let completed = false;
  for (let i = 0; i < 60; i++) {
    const { snapshot } = tick(engine, left);
    if (snapshot.isComplete) {
      completed = true;
      break;
    }
  }
  assert("turn_left completes for leftward nose shift", completed);
}

console.log("\nChallenge engine — turn right\n");
{
  const engine = new LivenessChallengeEngine();
  const reached = advanceTo(engine, "turn_right", open, closed);
  assert("engine reaches turn_right", reached);

  const right = makeFace(CENTER + TURN_DELTA_THRESHOLD * 80 * 1.5);
  for (let i = 0; i < TURN_BASELINE_FRAMES; i++) tick(engine, open);

  let completed = false;
  for (let i = 0; i < 60; i++) {
    const { snapshot } = tick(engine, right);
    if (snapshot.isComplete) {
      completed = true;
      break;
    }
  }
  assert("turn_right completes for rightward nose shift", completed);
}

console.log("\nChallenge engine — hold timing\n");
{
  const engine = new LivenessChallengeEngine();
  const reached = advanceTo(engine, "hold", open, closed);
  assert("engine reaches hold", reached);

  tick(engine, open, 10);
  advanceTime(HOLD_DURATION_MS + 100);
  const progress = engine.getHoldProgress(Date.now());
  assert("hold progress reaches ~100% with Date.now clock", progress > 0.9);
}

console.log("\nChallenge engine — blink\n");
{
  const engine = new LivenessChallengeEngine();
  completeAlign(engine, open);
  completeBlink(engine, open, closed);
  assert("blink step completes", engine.currentChallengeId === "turn_left");
}

console.log("\nChallenge engine — face loss resets turn calibration\n");
{
  const engine = new LivenessChallengeEngine();
  advanceTo(engine, "turn_left", open, closed);
  tick(engine, open);
  tick(engine, open);
  for (let i = 0; i < 10; i++) tick(engine, null);
  const before = engine.process(open, 640, 480, Date.now()).snapshot.feedback;
  assert("turn calibration restarts after face loss", before.includes("straight"));
}

console.log("\nMetrics sanity\n");
const metrics = extractMetrics(open.landmarks, open.detection.box, 640, 480);
assert("centered face has reasonable centering", metrics.centering >= ALIGN_MIN_CENTERING_FLOOR);
assert("centered face has reasonable scale", metrics.faceScale >= ALIGN_MIN_SCALE_FLOOR);

restoreTime();

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
