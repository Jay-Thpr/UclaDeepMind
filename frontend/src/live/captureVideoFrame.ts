/**
 * Grab one JPEG frame from a live video element (for annotation / uploads).
 */
export function captureVideoFrameAsJpegBase64(
  video: HTMLVideoElement | null,
  options: { maxWidth?: number; quality?: number } = {},
): string | null {
  const maxWidth = options.maxWidth ?? 896
  const quality = options.quality ?? 0.88
  if (!video?.videoWidth) {
    return null
  }
  const canvas = document.createElement('canvas')
  const scale = Math.min(1, maxWidth / video.videoWidth)
  canvas.width = Math.max(1, Math.round(video.videoWidth * scale))
  canvas.height = Math.max(1, Math.round(video.videoHeight * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return null
  }
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  const dataUrl = canvas.toDataURL('image/jpeg', quality)
  const comma = dataUrl.indexOf(',')
  return comma >= 0 ? dataUrl.slice(comma + 1) : null
}
