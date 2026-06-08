/**
 * Verifies head-turn yaw in selfie display space (matches on-screen preview).
 * Run: npm run test:yaw
 */

function computeYaw(noseX, faceCenterX, halfWidth) {
  return (faceCenterX - noseX) / halfWidth;
}

function detectTurn(delta, direction, threshold = 0.06) {
  if (direction === "left") return delta > threshold;
  return delta < -threshold;
}

const center = 200;
const hw = 50;
const baseline = computeYaw(center, center, hw);

let passed = 0;
let failed = 0;

function assert(name, condition) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}`);
  }
}

console.log("Yaw direction tests (display space)\n");

const leftYaw = computeYaw(170, center, hw);
const leftDelta = leftYaw - baseline;
assert("left on screen → positive yaw", leftYaw > 0.3);
assert("turn_left detects leftward turn", detectTurn(leftDelta, "left"));

const rightYaw = computeYaw(230, center, hw);
const rightDelta = rightYaw - baseline;
assert("right on screen → negative yaw", rightYaw < -0.3);
assert("turn_right detects rightward turn", detectTurn(rightDelta, "right"));

const neutralDelta = computeYaw(202, center, hw) - baseline;
assert("neutral pose does not trigger left", !detectTurn(neutralDelta, "left"));
assert("neutral pose does not trigger right", !detectTurn(neutralDelta, "right"));

function oldRawYaw(noseX, faceCenterX, halfWidth) {
  return (noseX - faceCenterX) / halfWidth;
}
const oldLeft = oldRawYaw(170, center, hw) - oldRawYaw(center, center, hw);
assert("old raw formula inverts left turn", !detectTurn(oldLeft, "left"));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
