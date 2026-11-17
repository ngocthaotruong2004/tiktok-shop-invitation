import { eventConfig, type CardVariant } from './config';
import { drawTitleReveal } from './titleReveal';
import { AnimatedGif } from './animatedGif';

export type SceneImage = HTMLImageElement | HTMLCanvasElement;
export type SceneAssets = Record<keyof typeof eventConfig.assets, SceneImage | undefined> & {
  backgroundAnimation?: AnimatedGif;
};

const WIDTH = 1080;
const HEIGHT = 1920;

// The white bag artwork ships on a solid black backdrop. Clear the black connected to the edges so only
// the white bag remains (the black TikTok note inside it stays opaque), then trim to the bag itself.
function knockOutBackdrop(image: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return canvas;
  context.drawImage(image, 0, 0);
  const { width, height } = canvas;
  const frame = context.getImageData(0, 0, width, height);
  const data = frame.data;
  const outside = new Uint8Array(width * height);
  const stack: number[] = [];
  const seed = (index: number): void => {
    if (!outside[index] && data[index * 4] < 60) {
      outside[index] = 1;
      stack.push(index);
    }
  };
  for (let x = 0; x < width; x += 1) {
    seed(x);
    seed((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    seed(y * width);
    seed(y * width + width - 1);
  }
  while (stack.length) {
    const index = stack.pop() as number;
    const x = index % width;
    if (x > 0) seed(index - 1);
    if (x < width - 1) seed(index + 1);
    if (index >= width) seed(index - width);
    if (index < width * (height - 1)) seed(index + width);
  }

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    if (outside[index]) {
      data[offset + 3] = 0;
      continue;
    }
    const x = index % width;
    const y = Math.floor(index / width);
    const touchesOutside =
      (x > 0 && outside[index - 1] === 1) ||
      (x < width - 1 && outside[index + 1] === 1) ||
      (index >= width && outside[index - width] === 1) ||
      (index < width * (height - 1) && outside[index + width] === 1);
    if (touchesOutside) {
      const luminance = data[offset];
      data[offset] = 255;
      data[offset + 1] = 255;
      data[offset + 2] = 255;
      data[offset + 3] = luminance;
    }
    if (data[offset + 3] > 8) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  context.putImageData(frame, 0, 0);
  if (maxX <= minX || maxY <= minY) return canvas;

  const trimmed = document.createElement('canvas');
  trimmed.width = maxX - minX + 1;
  trimmed.height = maxY - minY + 1;
  trimmed.getContext('2d')?.drawImage(canvas, minX, minY, trimmed.width, trimmed.height, 0, 0, trimmed.width, trimmed.height);
  return trimmed;
}

export async function loadSceneAssets(): Promise<SceneAssets> {
  let backgroundAnimation: AnimatedGif | undefined;
  const entries = await Promise.all(
    Object.entries(eventConfig.assets).map(async ([key, src]) => {
      if (!src) return [key, undefined] as const;
      try {
        if (key === 'background' && /\.gif(?:[?#]|$)/i.test(src)) {
          const response = await fetch(src);
          if (!response.ok) throw new Error(`Không thể tải nền thiệp (${response.status}).`);
          backgroundAnimation = new AnimatedGif(new Uint8Array(await response.arrayBuffer()));
          return [key, backgroundAnimation.canvas] as const;
        }
        const image = new Image();
        image.src = src;
        await image.decode();
        return [key, key === 'bagWhite' ? knockOutBackdrop(image) : image] as const;
      } catch (error) {
        if (key === 'background') throw error;
        return [key, undefined] as const;
      }
    }),
  );

  return { ...Object.fromEntries(entries), backgroundAnimation } as SceneAssets;
}

function drawFittedImage(
  context: CanvasRenderingContext2D,
  image: SceneImage,
  x: number,
  y: number,
  width: number,
  height: number,
  alpha = 1,
): void {
  const scale = Math.min(width / image.width, height / image.height);
  const imageWidth = image.width * scale;
  const imageHeight = image.height * scale;
  context.save();
  context.globalAlpha *= alpha;
  context.drawImage(image, x + (width - imageWidth) / 2, y + (height - imageHeight) / 2, imageWidth, imageHeight);
  context.restore();
}

export function drawBase(context: CanvasRenderingContext2D, assets: SceneAssets): void {
  const background = context.createLinearGradient(0, 0, WIDTH * 0.8, HEIGHT);
  background.addColorStop(0, '#020305');
  background.addColorStop(0.68, '#080b10');
  background.addColorStop(1, '#07141c');
  context.fillStyle = background;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  const image = assets.background;
  if (image) {
    context.drawImage(image, 0, 0, WIDTH, HEIGHT);
  } else {
    const haze = context.createRadialGradient(980, 1390, 20, 980, 1390, 510);
    haze.addColorStop(0, 'rgba(0, 190, 230, 0.2)');
    haze.addColorStop(1, 'rgba(0, 190, 230, 0)');
    context.fillStyle = haze;
    context.fillRect(500, 880, 580, 800);
  }

  if (assets.skyline) {
    drawFittedImage(context, assets.skyline, 650, 1150, 430, 440, 0.9);
  } else if (!image) {
    const buildings = [
      [770, 1330, 80, 300], [850, 1225, 75, 405], [930, 1395, 63, 235],
      [990, 1275, 76, 355], [715, 1450, 65, 180], [1030, 1420, 50, 210],
    ];
    for (const [x, y, width, height] of buildings) {
      context.fillStyle = '#07111d';
      context.fillRect(x, y, width, height);
      context.strokeStyle = 'rgba(37, 244, 238, 0.35)';
      context.lineWidth = 3;
      context.strokeRect(x + 2, y + 2, width - 4, height - 4);
      context.fillStyle = 'rgba(254, 44, 85, 0.7)';
      for (let windowY = y + 22; windowY < y + height - 14; windowY += 34) {
        context.fillRect(x + 16, windowY, 9, 12);
        context.fillRect(x + width - 25, windowY, 9, 12);
      }
    }
  }

  const pulse = 0.57;
  if (!image) {
  const gradient = context.createLinearGradient(0, 1160, 1080, 1260);
  gradient.addColorStop(0, eventConfig.colors.cyan);
  gradient.addColorStop(0.47, '#08141b');
  gradient.addColorStop(0.72, eventConfig.colors.pink);
  gradient.addColorStop(1, eventConfig.colors.cyan);
  context.save();
  context.globalAlpha = pulse;
  context.lineWidth = 15;
  context.shadowBlur = 35;
  context.shadowColor = eventConfig.colors.cyan;
  context.strokeStyle = gradient;
  context.beginPath();
  context.moveTo(-50, 1190);
  context.bezierCurveTo(200, 1295 + 0, 520, 1190, 1130, 1175);
  context.stroke();
  context.shadowColor = eventConfig.colors.pink;
  context.strokeStyle = eventConfig.colors.pink;
  context.lineWidth = 7;
  context.beginPath();
  context.moveTo(-30, 1230);
  context.bezierCurveTo(225, 1325, 650, 1210, 1110, 1200);
  context.stroke();
  context.restore();
  }

  if (assets.ribbonTop) {
    drawFittedImage(context, assets.ribbonTop, 650, 0, 430, 600, pulse);
  } else if (!image) {
    context.save();
    context.globalAlpha = pulse;
    context.lineCap = 'round';
    context.lineWidth = 15;
    context.shadowBlur = 34;
    context.shadowColor = eventConfig.colors.cyan;
    context.strokeStyle = eventConfig.colors.cyan;
    context.beginPath();
    context.moveTo(790, -65);
    context.bezierCurveTo(570, 120, 755, 195, 1015, 234);
    context.bezierCurveTo(1180, 259, 1146, 99, 1088, 25);
    context.stroke();
    context.shadowColor = eventConfig.colors.pink;
    context.strokeStyle = eventConfig.colors.pink;
    context.lineWidth = 9;
    context.beginPath();
    context.moveTo(1088, -80);
    context.bezierCurveTo(890, 55, 728, 120, 901, 219);
    context.stroke();
    context.restore();
  }
  if (assets.ribbonBottom) {
    drawFittedImage(context, assets.ribbonBottom, 0, 1430, 1080, 450, pulse);
  } else if (!image) {
    context.save();
    context.globalAlpha = pulse;
    context.lineCap = 'round';
    context.lineWidth = 11;
    context.shadowBlur = 32;
    context.shadowColor = eventConfig.colors.cyan;
    context.strokeStyle = eventConfig.colors.cyan;
    context.beginPath();
    context.moveTo(-30, 1800);
    context.bezierCurveTo(180, 1765, 421, 1874, 655, 1825);
    context.bezierCurveTo(832, 1790, 1005, 1837, 1115, 1784);
    context.stroke();
    context.shadowColor = eventConfig.colors.pink;
    context.strokeStyle = eventConfig.colors.pink;
    context.lineWidth = 7;
    context.beginPath();
    context.moveTo(-40, 1841);
    context.bezierCurveTo(235, 1793, 446, 1897, 734, 1849);
    context.bezierCurveTo(899, 1821, 1012, 1860, 1122, 1817);
    context.stroke();
    context.restore();
  }
}

// The artwork includes all invitation copy and attendance notes. Render the full image on every route
// without adding text or cropping the notes. Effect coordinates use the original design dimensions.
const POSTER_CROP = { x: 0, y: 0, width: 1201, height: 5400 };
const POSTER_SCALE = WIDTH / POSTER_CROP.width;
const POSTER_HEIGHT = Math.round(POSTER_CROP.height * POSTER_SCALE);
const toCanvasX = (x: number): number => (x - POSTER_CROP.x) * POSTER_SCALE;
const toCanvasY = (y: number): number => (y - POSTER_CROP.y) * POSTER_SCALE;

const RING_BREATH_SECONDS = 3;

const STAGE_BEAMS = [
  { x: 70, top: 0, bottom: 1470, color: '90, 240, 235', phase: 0 },
  { x: 1140, top: 0, bottom: 1470, color: '255, 50, 100', phase: Math.PI },
  { x: 230, top: 670, bottom: 1400, color: '255, 55, 105', phase: Math.PI / 2 },
  { x: 970, top: 670, bottom: 1400, color: '255, 55, 105', phase: Math.PI * 1.5 },
];

function drawStageBeams(context: CanvasRenderingContext2D, seconds: number): void {
  context.save();
  context.globalCompositeOperation = 'lighter';
  context.lineCap = 'round';

  for (const beam of STAGE_BEAMS) {
    const pulse = 0.5 + 0.5 * Math.sin((seconds / 1.6) * Math.PI * 2 + beam.phase);
    const travel = 0.5 - 0.5 * Math.cos((seconds / 4) * Math.PI * 2 + beam.phase);
    const peak = 0.08 + 0.84 * travel;
    const x = toCanvasX(beam.x);
    const top = toCanvasY(beam.top);
    const bottom = toCanvasY(beam.bottom);

    // A soft shaft pulses along each existing rail; a brighter band travels up and down it.
    const shaft = context.createLinearGradient(x, top, x, bottom);
    shaft.addColorStop(0, `rgba(${beam.color}, 0)`);
    shaft.addColorStop(0.12, `rgba(${beam.color}, ${0.08 + 0.22 * pulse})`);
    shaft.addColorStop(0.88, `rgba(${beam.color}, ${0.08 + 0.22 * pulse})`);
    shaft.addColorStop(1, `rgba(${beam.color}, 0)`);
    context.strokeStyle = shaft;
    context.shadowColor = `rgb(${beam.color})`;
    context.shadowBlur = (18 + 16 * pulse) * POSTER_SCALE;
    context.lineWidth = (12 + 8 * pulse) * POSTER_SCALE;
    context.beginPath();
    context.moveTo(x, top);
    context.lineTo(x, bottom);
    context.stroke();

    const highlight = context.createLinearGradient(x, top, x, bottom);
    highlight.addColorStop(0, `rgba(${beam.color}, 0)`);
    highlight.addColorStop(Math.max(0, peak - 0.2), `rgba(${beam.color}, 0)`);
    highlight.addColorStop(peak, `rgba(${beam.color}, ${0.35 + 0.5 * pulse})`);
    highlight.addColorStop(Math.min(1, peak + 0.2), `rgba(${beam.color}, 0)`);
    highlight.addColorStop(1, `rgba(${beam.color}, 0)`);
    context.strokeStyle = highlight;
    context.shadowBlur = (12 + 12 * pulse) * POSTER_SCALE;
    context.lineWidth = 5 * POSTER_SCALE;
    context.stroke();
  }
  context.restore();
}

// Soft bands follow the stage steps beneath the guest role, without adding sparkle particles.
const STAGE_LIGHTS = [
  { y: 1376, radiusX: 440, radiusY: 30, alpha: 0.6 },
  { y: 1430, radiusX: 485, radiusY: 18, alpha: 0.35 },
  { y: 1482, radiusX: 525, radiusY: 16, alpha: 0.22 },
];

function drawStageFlash(context: CanvasRenderingContext2D, seconds: number): void {
  const pulse = (0.5 - 0.5 * Math.cos((seconds / 2) * Math.PI * 2)) ** 3;
  if (pulse < 0.001) return;

  for (const light of STAGE_LIGHTS) {
    context.save();
    context.globalCompositeOperation = 'lighter';
    context.translate(toCanvasX(600), toCanvasY(light.y));
    context.scale(light.radiusX * POSTER_SCALE, light.radiusY * POSTER_SCALE);
    const glow = context.createRadialGradient(0, 0, 0, 0, 0, 1);
    const alpha = light.alpha * pulse;
    glow.addColorStop(0, `rgba(255, 170, 190, ${alpha})`);
    glow.addColorStop(0.4, `rgba(255, 65, 110, ${alpha * 0.65})`);
    glow.addColorStop(1, 'rgba(255, 45, 90, 0)');
    context.fillStyle = glow;
    context.fillRect(-1, -1, 2, 2);
    context.restore();
  }
}

// Pulse settings for the portrait halo.
function haloState(seconds: number): { expansion: number; alpha: number; flash: number; rimBreath: number } {
  const breath = 0.5 + 0.5 * Math.sin((seconds / RING_BREATH_SECONDS) * Math.PI * 2 - 0.6);
  const flash = Math.max(0, Math.sin((seconds / 4.2) * Math.PI * 2)) ** 4;
  return {
    expansion: 0.32 + 0.1 * breath + 0.08 * flash,
    alpha: 0.2 + 0.2 * breath + 0.3 * flash,
    flash,
    rimBreath: 0.5 + 0.5 * Math.sin((seconds / RING_BREATH_SECONDS) * Math.PI * 2),
  };
}

// Keep the glow outside the badge so its original lettering stays crisp.
const BADGE = { x: 644, y: 244, width: 308, height: 120 };
const BADGE_PULSE_SECONDS = 1.6;
function drawBadgeEffect(context: CanvasRenderingContext2D, seconds: number): void {
  const left = toCanvasX(BADGE.x);
  const top = toCanvasY(BADGE.y);
  const width = BADGE.width * POSTER_SCALE;
  const height = BADGE.height * POSTER_SCALE;
  // A full sine wave keeps successive flashes connected, with five seamless pulses per 8 s video.
  const rimBreath = 0.5 - 0.5 * Math.cos((seconds / BADGE_PULSE_SECONDS) * Math.PI * 2);
  const flash = 0.2 + 0.8 * rimBreath ** 2;
  const expansion = 0.36 + 0.14 * rimBreath;
  const alpha = 0.35 + 0.35 * rimBreath;
  const reach = height * expansion;
  const tilt = -0.045;

  // Trace the badge directly, like the photo ring: a broad halo, a bright neon rim and a short flash.
  // Clip its interior to preserve the original white lettering and hot-pink fill.
  context.save();
  context.globalCompositeOperation = 'lighter';
  context.translate(left + width / 2, top + height / 2);
  context.rotate(tilt);
  const padding = reach * 3;
  context.beginPath();
  context.rect(-width / 2 - padding, -height / 2 - padding, width + padding * 2, height + padding * 2);
  context.roundRect(-width / 2, -height / 2, width, height, 2 * POSTER_SCALE);
  context.clip('evenodd');
  const trace = (): void => {
    context.beginPath();
    context.roundRect(-width / 2, -height / 2, width, height, 2 * POSTER_SCALE);
  };
  context.strokeStyle = `rgba(255, 70, 120, ${alpha})`;
  context.shadowColor = '#ff4678';
  context.shadowBlur = reach;
  context.lineWidth = (12 + 12 * flash) * POSTER_SCALE;
  trace();
  context.stroke();

  context.globalAlpha = 0.65 + 0.35 * rimBreath;
  context.strokeStyle = '#ff4678';
  context.shadowBlur = 10 + 34 * rimBreath + 20 * flash;
  context.lineWidth = (4 + 4 * flash) * POSTER_SCALE;
  trace();
  context.stroke();

  context.globalAlpha = 0.12 + 0.78 * flash;
  context.strokeStyle = '#fff0f5';
  context.shadowColor = '#ffb3cb';
  context.shadowBlur = 6 + 22 * flash;
  context.lineWidth = (1.5 + 2 * flash) * POSTER_SCALE;
  trace();
  context.stroke();
  context.restore();
}

function drawGuestPortrait(context: CanvasRenderingContext2D, photo: SceneImage | undefined): void {
  const centerX = toCanvasX(600);
  const centerY = toCanvasY(892);
  const radius = 238 * POSTER_SCALE;
  if (photo) {
    // Frame the head and shoulders of the supplied portrait without distorting the image.
    const cropSize = Math.min(photo.width, photo.height) * 0.82;
    const cropX = (photo.width - cropSize) / 2;
    const cropY = (photo.height - cropSize) * 0.04;
    context.save();
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.clip();
    context.drawImage(photo, cropX, cropY, cropSize, cropSize,
      centerX - radius, centerY - radius, radius * 2, radius * 2);
    context.restore();
  }
}

function drawGuestRing(context: CanvasRenderingContext2D, photo: SceneImage | undefined, seconds: number): void {
  drawGuestPortrait(context, photo);
  const centerX = toCanvasX(600);
  const centerY = toCanvasY(892);
  const radius = 238 * POSTER_SCALE;
  // Circular halo of light surrounding the frame: it swells and flashes softly, then fades.
  const { expansion, alpha: haloAlpha, rimBreath } = haloState(seconds);
  const haloReach = radius * (1 + expansion);
  const haloGradient = context.createRadialGradient(centerX, centerY, radius - 6, centerX, centerY, haloReach);
  haloGradient.addColorStop(0, `rgba(255, 70, 120, ${haloAlpha})`);
  haloGradient.addColorStop(0.35, `rgba(255, 70, 120, ${haloAlpha * 0.45})`);
  haloGradient.addColorStop(1, 'rgba(255, 70, 120, 0)');
  context.save();
  context.globalCompositeOperation = 'lighter';
  context.fillStyle = haloGradient;
  context.beginPath();
  context.rect(centerX - haloReach, centerY - haloReach, haloReach * 2, haloReach * 2);
  context.arc(centerX, centerY, radius - 2, 0, Math.PI * 2, true);
  context.fill('evenodd');
  context.restore();

  const ring = context.createLinearGradient(centerX - radius, centerY, centerX + radius, centerY);
  ring.addColorStop(0, eventConfig.colors.cyan);
  ring.addColorStop(1, eventConfig.colors.pink);
  context.save();
  context.shadowColor = eventConfig.colors.pink;
  context.shadowBlur = 24;
  context.strokeStyle = ring;
  context.lineWidth = 8;
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.stroke();
  context.restore();

  // The ring breathes: the neon glow swells and fades smoothly while the line stays whole.
  const breath = rimBreath;
  context.save();
  context.strokeStyle = ring;
  context.lineWidth = 8;
  context.globalAlpha = 0.65 + 0.35 * breath;
  context.shadowColor = eventConfig.colors.cyan;
  context.shadowBlur = 10 + 34 * breath;
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.stroke();
  context.shadowColor = eventConfig.colors.pink;
  context.shadowBlur = 6 + 22 * breath;
  context.stroke();
  context.restore();

}

function drawGuestName(context: CanvasRenderingContext2D, guestName: string): void {
  const name = guestName.toLocaleUpperCase('vi-VN');
  const font = '"Be Vietnam Pro", sans-serif';
  let size = 74.8 * POSTER_SCALE;
  context.save();
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.font = `800 ${size}px ${font}`;
  while (context.measureText(name).width > 900 * POSTER_SCALE && size > 24 * POSTER_SCALE) {
    size -= POSTER_SCALE;
    context.font = `800 ${size}px ${font}`;
  }
  context.fillStyle = eventConfig.colors.cyan;
  context.shadowColor = 'rgba(0, 0, 0, 0.65)';
  context.shadowBlur = 8 * POSTER_SCALE;
  context.shadowOffsetY = 2 * POSTER_SCALE;
  context.fillText(name, WIDTH / 2, toCanvasY(1452));
  context.restore();
}

export function drawScene(
  context: CanvasRenderingContext2D,
  assets: SceneAssets,
  guestName: string,
  seconds: number,
  variant: CardVariant,
): void {
  const poster = assets.backgroundAnimation?.frameAt(seconds) ?? assets.background;
  const height = poster ? Math.round(WIDTH * poster.height / poster.width) : POSTER_HEIGHT;
  if (context.canvas.height !== height) context.canvas.height = height;
  context.save();
  context.clearRect(0, 0, WIDTH, height);
  if (poster) {
    context.drawImage(poster, 0, 0, WIDTH, height);
    if (!eventConfig.backgroundIncludesEffects) drawTitleReveal(context, poster, seconds, POSTER_SCALE);
  } else {
    context.fillStyle = '#12060c';
    context.fillRect(0, 0, WIDTH, height);
  }
  if (!eventConfig.backgroundIncludesEffects) {
    drawStageBeams(context, seconds);
    drawStageFlash(context, seconds);
    drawBadgeEffect(context, seconds);
    if (variant.showGuestPhoto) drawGuestRing(context, assets.guestPhoto, seconds);
  } else if (variant.showGuestPhoto) {
    drawGuestPortrait(context, assets.guestPhoto);
  }
  drawGuestName(context, guestName);
  context.restore();
}
