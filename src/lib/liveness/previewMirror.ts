/**
 * Controls CSS video mirror and detection-canvas flip so landmarks always land
 * in the same on-screen (selfie) coordinate space.
 *
 * Mobile / tablet front cameras usually deliver an already-mirrored feed.
 * Desktop webcams do not — we mirror for a natural selfie preview.
 */
export function isMobileLikeDevice(): boolean {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    return true;
  }

  // iPadOS 13+ reports as Macintosh but has touch
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) {
    return true;
  }

  return false;
}

/** True on desktop — apply CSS mirror + flip detection frames to display space. */
export function shouldMirrorSelfiePreview(): boolean {
  return !isMobileLikeDevice();
}
