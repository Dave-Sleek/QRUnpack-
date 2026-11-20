import jsQR from 'jsqr';
import type { CropRect } from '../types';

export interface DecodeAttemptResult {
  text: string;
  passUsed: string;
  location: {
    topLeftCorner: { x: number; y: number };
    topRightCorner: { x: number; y: number };
    bottomRightCorner: { x: number; y: number };
    bottomLeftCorner: { x: number; y: number };
  };
}

function runJsQrOnCanvas(canvas: HTMLCanvasElement): ReturnType<typeof jsQR> {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth',
  });
}

function drawRegionToCanvas(
  source: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
  targetWidth: number,
  targetHeight: number,
  crop?: CropRect,
  padding = 0,
  paddingColor = '#ffffff',
  smooth = true
): HTMLCanvasElement {
  const srcW =
    source instanceof HTMLVideoElement
      ? source.videoWidth
      : source instanceof HTMLImageElement
        ? source.naturalWidth
        : source.width;
  const srcH =
    source instanceof HTMLVideoElement
      ? source.videoHeight
      : source instanceof HTMLImageElement
        ? source.naturalHeight
        : source.height;

  const sx = crop ? Math.max(0, Math.round(crop.x)) : 0;
  const sy = crop ? Math.max(0, Math.round(crop.y)) : 0;
  const sw = crop ? Math.min(srcW - sx, Math.max(1, Math.round(crop.width))) : srcW;
  const sh = crop ? Math.min(srcH - sy, Math.max(1, Math.round(crop.height))) : srcH;

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth + padding * 2;
  canvas.height = targetHeight + padding * 2;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.fillStyle = paddingColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = smooth;
  ctx.drawImage(source, sx, sy, sw, sh, padding, padding, targetWidth, targetHeight);
  return canvas;
}

function applyContrastPass(canvas: HTMLCanvasElement, mode: 'boost' | 'threshold'): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = canvas.width;
  out.height = canvas.height;
  const srcCtx = canvas.getContext('2d', { willReadFrequently: true });
  const outCtx = out.getContext('2d', { willReadFrequently: true });
  if (!srcCtx || !outCtx) return canvas;

  const imgData = srcCtx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  if (mode === 'boost') {
    const contrast = 1.85;
    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const boosted = Math.max(0, Math.min(255, (lum - 128) * contrast + 128));
      data[i] = boosted;
      data[i + 1] = boosted;
      data[i + 2] = boosted;
      data[i + 3] = 255;
    }
  } else {
    // Compute mean luminance for binarization
    let sum = 0;
    const count = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    const mean = sum / Math.max(1, count);
    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const v = lum >= mean ? 255 : 0;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
  }

  outCtx.putImageData(imgData, 0, 0);
  return out;
}

/**
 * Multi-scale, quiet-zone padded, and high-contrast client-side QR decoder using jsQR.
 */
export function decodeQrFromSource(
  source: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
  crop?: CropRect
): DecodeAttemptResult | null {
  const naturalW =
    source instanceof HTMLVideoElement
      ? source.videoWidth
      : source instanceof HTMLImageElement
        ? source.naturalWidth
        : source.width;
  const naturalH =
    source instanceof HTMLVideoElement
      ? source.videoHeight
      : source instanceof HTMLImageElement
        ? source.naturalHeight
        : source.height;

  if (!naturalW || !naturalH) return null;

  const baseW = crop ? Math.max(1, Math.round(crop.width)) : naturalW;
  const baseH = crop ? Math.max(1, Math.round(crop.height)) : naturalH;

  // Pass 1: Original or clamped down to 1600px max side
  const maxDim = 1600;
  const clampScale = Math.max(baseW, baseH) > maxDim ? maxDim / Math.max(baseW, baseH) : 1;
  const p1W = Math.max(1, Math.round(baseW * clampScale));
  const p1H = Math.max(1, Math.round(baseH * clampScale));

  const c1 = drawRegionToCanvas(source, p1W, p1H, crop, 0);
  const r1 = runJsQrOnCanvas(c1);
  if (r1?.data) {
    return { text: r1.data, passUsed: 'Original scale', location: r1.location };
  }

  // Pass 2: Quiet-zone padded pass (fixes tightly cropped QR screenshots)
  const c2 = drawRegionToCanvas(source, p1W, p1H, crop, 28, '#ffffff');
  const r2 = runJsQrOnCanvas(c2);
  if (r2?.data) {
    return { text: r2.data, passUsed: 'Quiet-zone padded', location: r2.location };
  }

  // Pass 3: Upscaled 2x pass for small/blurry QR screenshots (with quiet zone)
  if (Math.max(baseW, baseH) < 950) {
    const upScale = Math.min(2.5, 1100 / Math.max(baseW, baseH));
    const upW = Math.round(baseW * upScale);
    const upH = Math.round(baseH * upScale);
    const c3Sharp = drawRegionToCanvas(source, upW, upH, crop, 24, '#ffffff', false);
    const r3Sharp = runJsQrOnCanvas(c3Sharp);
    if (r3Sharp?.data) {
      return { text: r3Sharp.data, passUsed: '2x crisp upscale', location: r3Sharp.location };
    }

    const c3Smooth = drawRegionToCanvas(source, upW, upH, crop, 24, '#ffffff', true);
    const r3Smooth = runJsQrOnCanvas(c3Smooth);
    if (r3Smooth?.data) {
      return { text: r3Smooth.data, passUsed: '2x smooth upscale', location: r3Smooth.location };
    }
  }

  // Pass 4: Downscaled 900px pass (large high-DPI phone screenshots often decode cleaner at 900px)
  if (Math.max(baseW, baseH) > 950) {
    const downScale = 900 / Math.max(baseW, baseH);
    const dW = Math.round(baseW * downScale);
    const dH = Math.round(baseH * downScale);
    const c4 = drawRegionToCanvas(source, dW, dH, crop, 20, '#ffffff', true);
    const r4 = runJsQrOnCanvas(c4);
    if (r4?.data) {
      return { text: r4.data, passUsed: 'Normalized downscale', location: r4.location };
    }
  }

  // Pass 5: High-contrast luminance boost on padded canvas
  const boosted = applyContrastPass(c2, 'boost');
  const r5 = runJsQrOnCanvas(boosted);
  if (r5?.data) {
    return { text: r5.data, passUsed: 'High-contrast pass', location: r5.location };
  }

  // Pass 6: Adaptive binarization threshold pass
  const thresholded = applyContrastPass(c2, 'threshold');
  const r6 = runJsQrOnCanvas(thresholded);
  if (r6?.data) {
    return { text: r6.data, passUsed: 'Threshold pass', location: r6.location };
  }

  return null;
}

/**
 * Fast single-pass decode specifically optimized for 30fps live camera frames.
 */
export function decodeQrFromVideoFrame(
  video: HTMLVideoElement,
  scratchCanvas: HTMLCanvasElement
): DecodeAttemptResult | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;

  const targetMax = 720;
  const scale = Math.max(vw, vh) > targetMax ? targetMax / Math.max(vw, vh) : 1;
  const w = Math.round(vw * scale);
  const h = Math.round(vh * scale);

  if (scratchCanvas.width !== w || scratchCanvas.height !== h) {
    scratchCanvas.width = w;
    scratchCanvas.height = h;
  }

  const ctx = scratchCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  const res = jsQR(imageData.data, w, h, { inversionAttempts: 'attemptBoth' });
  if (res?.data) {
    return { text: res.data, passUsed: 'Live camera', location: res.location };
  }
  return null;
}

export function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image data. Ensure it is a valid PNG, JPG, WEBP, or GIF.'));
    img.src = url;
  });
}
