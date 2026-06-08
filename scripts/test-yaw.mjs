/**
 * Verifies head-turn yaw for desktop (raw sensor) and mobile (mirrored sensor).
 * Run: node scripts/test-yaw.mjs
 */

function computeYaw(noseX, faceCenterX, halfWidth, sensorMirrored = false) {
  const raw = (noseX - faceCenterX) / halfWidth;
  return sensorMirrored ? -raw : raw;
}

function detectTurn(delta, direction, threshold = 0.06) {
  if (direction === "left") return delta > threshold;
  return delta < -threshold;
}

const center = 200;
const hw = 50;
const baseline = (mirrored) => computeYaw(center, center, hw, mirrored);

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

console.log("Yaw direction tests\n");

// Desktop: unmirrored sensor — physical left raises nose x
const desktopLeft = computeYaw(230, center, hw, false) - baseline(false);
assert("desktop: physical left → positive yaw", desktopLeft > 0.3);
assert("desktop: turn_left accepts physical left", detectTurn(desktopLeft, "left"));

const desktopRight = computeYaw(170, center, hw, false) - baseline(false);
assert("desktop: physical right → negative yaw", desktopRight < -0.3);
assert("desktop: turn_right accepts physical right", detectTurn(desktopRight, "right"));

// Mobile: mirrored sensor — physical left lowers nose x in frame
const mobileLeft = computeYaw(170, center, hw, true) - baseline(true);
assert("mobile: physical left → positive yaw", mobileLeft > 0.3);
assert("mobile: turn_left accepts physical left", detectTurn(mobileLeft, "left"));

const mobileRight = computeYaw(230, center, hw, true) - baseline(true);
assert("mobile: physical right → negative yaw", mobileRight < -0.3);
assert("mobile: turn_right accepts physical right", detectTurn(mobileRight, "right"));

// Prior buggy preview-only formula rejected mobile left
const buggy = (center - 170) / hw;
assert("buggy preview formula alone is wrong for mobile raw coords", buggy > 0);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
