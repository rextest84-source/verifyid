/**
 * Selfie preview mirroring — always mirror so left/right match a bathroom mirror.
 * Detection frames are flipped the same way so overlays and yaw stay aligned.
 */
export function isMobileLikeDevice(): boolean {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    return true;
  }

  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) {
    return true;
  }

  if (navigator.maxTouchPoints > 0 && typeof window !== "undefined" && window.innerWidth <= 1024) {
    return true;
  }

  return false;
}

/** Always mirror the live selfie preview (CSS + detection normalization). */
export function shouldMirrorSelfiePreview(): boolean {
  return true;
}

/** Flip detection frames so landmarks match the mirrored preview. */
export function shouldFlipDetectionFrame(): boolean {
  return true;
}
