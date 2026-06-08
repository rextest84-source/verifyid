/**
 * Verifies head-turn yaw matches mirrored selfie preview directions.
 * Run: node scripts/test-yaw.mjs
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

console.log("Yaw direction tests (mirrored preview space)\n");

// Screen-left turn: nose shifts left in preview → lower raw x
const leftYaw = computeYaw(170, center, hw);
const leftDelta = leftYaw - baseline;
assert("preview-left produces positive yaw", leftYaw > 0.3);
assert("turn_left detects screen-left turn", detectTurn(leftDelta, "left"));

// Screen-right turn: nose shifts right in preview → higher raw x
const rightYaw = computeYaw(230, center, hw);
const rightDelta = rightYaw - baseline;
assert("preview-right produces negative yaw", rightYaw < -0.3);
assert("turn_right detects screen-right turn", detectTurn(rightDelta, "right"));

// Neutral pose should not trigger either turn
const neutralDelta = computeYaw(202, center, hw) - baseline;
assert("neutral pose does not trigger left", !detectTurn(neutralDelta, "left"));
assert("neutral pose does not trigger right", !detectTurn(neutralDelta, "right"));

// Old (buggy) raw formula would invert left/right
function oldComputeYaw(noseX, faceCenterX, halfWidth) {
  return (noseX - faceCenterX) / halfWidth;
}
const oldLeft = oldComputeYaw(170, center, hw) - oldComputeYaw(center, center, hw);
assert("old formula wrongly rejects screen-left", !detectTurn(oldLeft, "left"));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
