/**
 * Mobile browsers usually mirror the front-camera feed already.
 * Applying CSS scaleX(-1) on top causes a double-flip so left/right feel inverted.
 */
export function shouldMirrorSelfiePreview(): boolean {
  if (typeof navigator === "undefined") return true;
  return !/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}
