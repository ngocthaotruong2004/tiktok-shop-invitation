import type { SceneImage } from './scene';

// Coordinates in the original 1201 × 5400 artwork, including the script's descender.
const TITLE = { x: 240, y: 470, width: 770, height: 174 };
const DELAY = 0.3;
const DURATION = 2.7;
const backdropCache = new WeakMap<SceneImage, HTMLCanvasElement>();

function titleBackdrop(poster: SceneImage): HTMLCanvasElement | undefined {
  const cached = backdropCache.get(poster);
  if (cached) return cached;

  const patch = document.createElement('canvas');
  const { width, height } = TITLE;
  patch.width = width;
  patch.height = height;
  const context = patch.getContext('2d', { willReadFrequently: true });
  if (!context) return undefined;
  // Map design coordinates to the supplied artwork's native resolution.
  const sourceScaleX = poster.width / 1201;
  const sourceScaleY = sourceScaleX;
  context.drawImage(poster, TITLE.x * sourceScaleX, TITLE.y * sourceScaleY,
    width * sourceScaleX, height * sourceScaleY, 0, 0, width, height);
  const frame = context.getImageData(0, 0, width, height);
  const original = frame.data;
  const mask = new Uint8Array(width * height);

  // Select the white lettering and its antialiased edges; leave the coloured stage intact.
  for (let y = 3; y < height - 3; y += 1) {
    for (let x = 3; x < width - 3; x += 1) {
      const offset = (y * width + x) * 4;
      if (Math.min(original[offset], original[offset + 1], original[offset + 2]) <= 48) continue;
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) mask[(y + dy) * width + x + dx] = 1;
      }
    }
  }

  const pixels: number[] = [];
  const filled = new Float32Array(original);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      if (!mask[y * width + x]) continue;
      const offset = (y * width + x) * 4;
      pixels.push(offset);
      for (let channel = 0; channel < 3; channel += 1) {
        const top = original[x * 4 + channel];
        const bottom = original[((height - 1) * width + x) * 4 + channel];
        filled[offset + channel] = top + (bottom - top) * y / (height - 1);
      }
    }
  }

  // Reconstruct the smooth background only beneath the glyphs. The cached patch avoids per-frame
  // pixel processing, and its untouched pixels prevent a rectangular overlay from appearing.
  for (let pass = 0; pass < 120; pass += 1) {
    let change = 0;
    for (const offset of pixels) {
      for (let channel = 0; channel < 3; channel += 1) {
        const index = offset + channel;
        const value = (filled[index - 4] + filled[index + 4]
          + filled[index - width * 4] + filled[index + width * 4]) / 4;
        change = Math.max(change, Math.abs(value - filled[index]));
        filled[index] = value;
      }
    }
    if (change < 0.05) break;
  }
  for (const offset of pixels) {
    for (let channel = 0; channel < 3; channel += 1) original[offset + channel] = filled[offset + channel];
  }
  context.putImageData(frame, 0, 0);
  backdropCache.set(poster, patch);
  return patch;
}

export function drawTitleReveal(
  context: CanvasRenderingContext2D,
  poster: SceneImage,
  seconds: number,
  scale: number,
): void {
  const progress = Math.max(0, Math.min(1, (seconds - DELAY) / DURATION));
  if (progress >= 1) return;
  const backdrop = titleBackdrop(poster);
  if (!backdrop) return;
  const eased = progress * progress * (3 - 2 * progress);
  context.save();
  context.globalAlpha = 1 - eased;
  context.drawImage(backdrop, TITLE.x * scale, TITLE.y * scale, TITLE.width * scale, TITLE.height * scale);
  context.restore();
}
