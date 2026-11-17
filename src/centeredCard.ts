import { eventConfig, type CardVariant } from './config';
import { drawBase, type SceneAssets, type SceneImage } from './scene';

const WIDTH = 1080;
const HEIGHT = 1920;
const FONT = '"Be Vietnam Pro", sans-serif';
const CENTER = WIDTH / 2;

function fitFont(
  context: CanvasRenderingContext2D,
  text: string,
  weight: number,
  size: number,
  maxWidth: number,
  minSize = 24,
): number {
  let fitted = size;
  context.font = `${weight} ${fitted}px ${FONT}`;
  while (context.measureText(text).width > maxWidth && fitted > minSize) {
    fitted -= 1;
    context.font = `${weight} ${fitted}px ${FONT}`;
  }
  return fitted;
}

let iconCache: { source: SceneImage; icon: HTMLCanvasElement } | undefined;

// The supplied logo stacks "TikTok" over "Shop"; cut the note icon out of it (everything left of the
// first empty column) so it can sit next to the wordmark on one line.
function logoIcon(logo: SceneImage): HTMLCanvasElement {
  if (iconCache && iconCache.source === logo) return iconCache.icon;
  const scan = document.createElement('canvas');
  scan.width = logo.width;
  scan.height = logo.height;
  const scanContext = scan.getContext('2d', { willReadFrequently: true });
  let iconWidth = Math.round(logo.width * 0.36);
  if (scanContext) {
    scanContext.drawImage(logo, 0, 0);
    const { data } = scanContext.getImageData(0, 0, scan.width, scan.height);
    let started = false;
    for (let x = 0; x < scan.width; x += 1) {
      let filled = false;
      for (let y = 0; y < scan.height; y += 1) {
        if (data[(y * scan.width + x) * 4 + 3] > 24) {
          filled = true;
          break;
        }
      }
      if (filled) started = true;
      else if (started) {
        iconWidth = x;
        break;
      }
    }
  }
  const icon = document.createElement('canvas');
  icon.width = iconWidth;
  icon.height = logo.height;
  icon.getContext('2d')?.drawImage(logo, 0, 0, iconWidth, logo.height, 0, 0, iconWidth, logo.height);
  iconCache = { source: logo, icon };
  return icon;
}

function drawHorizontalLogo(context: CanvasRenderingContext2D, assets: SceneAssets, top: number): void {
  const iconHeight = 74;
  const gap = 16;
  context.save();
  context.textAlign = 'left';
  context.font = `800 56px ${FONT}`;
  const boldWidth = context.measureText('TikTok').width;
  context.font = `500 56px ${FONT}`;
  const lightWidth = context.measureText(' Shop').width;
  const logo = assets.logo;
  const icon = logo ? logoIcon(logo) : undefined;
  const iconWidth = icon ? (iconHeight * icon.width) / icon.height : 0;
  const total = iconWidth + (icon ? gap : 0) + boldWidth + lightWidth;
  let x = CENTER - total / 2;
  if (icon) {
    context.drawImage(icon, x, top - iconHeight / 2 - 6, iconWidth, iconHeight);
    x += iconWidth + gap;
  }
  context.fillStyle = eventConfig.colors.white;
  const baseline = top + 22;
  context.font = `800 56px ${FONT}`;
  context.fillText('TikTok', x, baseline);
  context.font = `500 56px ${FONT}`;
  context.fillText(' Shop', x + boldWidth, baseline);
  context.restore();
}

const LOOP = 8;

// A short line travels around a frame outline; two laps fit the 8 s timeline so it loops.
function runBorder(
  context: CanvasRenderingContext2D,
  seconds: number,
  perimeter: number,
  trace: () => void,
  glow: string,
  phase = 0,
): void {
  const streak = perimeter * 0.16;
  context.save();
  context.lineCap = 'round';
  context.setLineDash([streak, perimeter - streak]);
  context.lineDashOffset = -(((seconds / (LOOP / 2)) + phase) % 1) * perimeter;
  context.strokeStyle = glow;
  context.lineWidth = 8;
  trace();
  context.stroke();
  context.strokeStyle = '#ffffff';
  context.lineWidth = 3;
  trace();
  context.stroke();
  context.restore();
}

function roundedPerimeter(width: number, height: number, radius: number): number {
  return 2 * (width + height) - (8 - 2 * Math.PI) * radius;
}

// Centered stack: lockup, event title, round guest photo, greeting, name, date box and venue box.
export function drawCenteredCard(
  context: CanvasRenderingContext2D,
  assets: SceneAssets,
  guestName: string,
  variant: CardVariant,
  seconds: number,
): void {
  const { colors } = eventConfig;
  // Without the guest photo the lower blocks move up and the card is shortened to match.
  const shift = variant.showGuestPhoto ? 0 : -450;
  const height = variant.showGuestPhoto ? HEIGHT : 1680 + shift + 120;
  if (context.canvas.height !== height) context.canvas.height = height;
  context.save();
  context.clearRect(0, 0, WIDTH, height);
  drawBase(context, assets);
  const shade = context.createLinearGradient(0, 0, 0, height);
  shade.addColorStop(0, 'rgba(3, 5, 8, 0.62)');
  shade.addColorStop(0.7, 'rgba(3, 5, 8, 0.5)');
  shade.addColorStop(1, 'rgba(3, 5, 8, 0.85)');
  context.fillStyle = shade;
  context.fillRect(0, 0, WIDTH, height);
  context.textAlign = 'center';

  // Brand mark: TikTok note icon and "TikTok Shop" on a single row.
  context.save();
  drawHorizontalLogo(context, assets, 100);
  context.restore();

  // Hội Chủ CHỐT lockup with tagline.
  context.save();
  context.textAlign = 'left';
  context.font = `900 92px ${FONT}`;
  const hoiWidth = context.measureText(eventConfig.keyVisual[0]).width;
  const chuWidth = context.measureText(eventConfig.keyVisual[1]).width;
  const gap = 26;
  const stampWidth = 270;
  const lockupWidth = hoiWidth + gap + chuWidth + gap + stampWidth;
  let x = CENTER - lockupWidth / 2;
  const baseline = 262;
  context.fillStyle = colors.white;
  context.fillText(eventConfig.keyVisual[0], x, baseline);
  x += hoiWidth + gap;
  context.fillStyle = colors.cyan;
  context.fillText(eventConfig.keyVisual[1], x, baseline);
  x += chuWidth + gap;
  context.save();
  context.translate(x, baseline - 8);
  context.rotate(-0.04);
  context.fillStyle = colors.pink;
  context.fillRect(0, -78, stampWidth, 104);
  context.fillStyle = colors.white;
  context.font = `900 70px ${FONT}`;
  context.fillText(eventConfig.keyVisual[2], 14, 0);
  context.restore();

  context.font = `700 38px ${FONT}`;
  const tagline = [
    { text: 'Nhà ', color: colors.white },
    { text: 'Sáng Tạo ', color: colors.cyan },
    { text: 'Bán Hàng ', color: colors.white },
    { text: 'Mới', color: colors.cyan },
  ];
  const taglineWidth = tagline.reduce((total, part) => total + context.measureText(part.text).width, 0);
  let taglineX = CENTER - taglineWidth / 2;
  for (const part of tagline) {
    context.fillStyle = part.color;
    context.fillText(part.text, taglineX, 330);
    taglineX += context.measureText(part.text).width;
  }
  context.restore();

  // Event title.
  context.textAlign = 'center';
  const titleGradient = context.createLinearGradient(190, 0, 890, 0);
  titleGradient.addColorStop(0, colors.white);
  titleGradient.addColorStop(1, colors.cyan);
  context.fillStyle = titleGradient;
  const titleSize = fitFont(context, eventConfig.eventTitle, 900, 150, 880);
  context.font = `900 ${titleSize}px ${FONT}`;
  context.save();
  context.fillText(eventConfig.eventTitle, CENTER, 480);
  context.restore();

  // Round guest photo.
  const photoY = 790;
  if (variant.showGuestPhoto) {
  const radius = 215;
  context.save();
  context.save();
  context.shadowColor = colors.pink;
  context.shadowBlur = 36;
  context.fillStyle = 'rgba(7, 9, 13, 0.95)';
  context.beginPath();
  context.arc(CENTER, photoY, radius, 0, Math.PI * 2);
  context.fill();
  context.restore();
  context.save();
  context.beginPath();
  context.arc(CENTER, photoY, radius - 4, 0, Math.PI * 2);
  context.clip();
  const photo = assets.guestPhoto;
  if (photo) {
    const cover = Math.max((radius * 2) / photo.width, (radius * 2) / photo.height);
    const width = photo.width * cover;
    const height = photo.height * cover;
    context.drawImage(photo, CENTER - width / 2, photoY - radius - (height - radius * 2) * 0.2, width, height);
  } else {
    context.fillStyle = 'rgba(247, 248, 250, 0.22)';
    context.beginPath();
    context.arc(CENTER, photoY - 50, 80, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.arc(CENTER, photoY + 230, 160, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
  context.strokeStyle = colors.pink;
  context.lineWidth = 10;
  context.beginPath();
  context.arc(CENTER, photoY, radius, 0, Math.PI * 2);
  context.stroke();
  runBorder(
    context,
    seconds,
    2 * Math.PI * radius,
    () => {
      context.beginPath();
      context.arc(CENTER, photoY, radius, 0, Math.PI * 2);
    },
    colors.pink,
  );
  context.restore();
  }

  context.save();
  context.translate(0, shift);

  // Greeting, role, name and lead-in.
  context.save();
  context.textAlign = 'center';
  context.fillStyle = colors.white;
  context.font = `600 56px ${FONT}`;
  context.fillText(eventConfig.invitation.replace(/,$/, ''), CENTER, 1098);

  context.font = `500 38px ${FONT}`;
  context.fillText(variant.guestRole, CENTER, 1160);

  const nameSize = fitFont(context, guestName, 900, 96, 920, 44);
  context.font = `900 ${nameSize}px ${FONT}`;
  context.fillStyle = colors.cyan;
  context.fillText(guestName, CENTER, 1256);

  context.textAlign = 'center';
  context.fillStyle = colors.white;
  context.font = `500 38px ${FONT}`;
  context.fillText(eventConfig.leadIn, CENTER, 1326);
  context.restore();

  // Date and time box.
  context.save();
  const boxX = 110;
  const boxWidth = WIDTH - boxX * 2;
  context.beginPath();
  context.roundRect(boxX, 1376, boxWidth, 104, 26);
  context.fillStyle = 'rgba(6, 16, 20, 0.9)';
  context.fill();
  context.strokeStyle = colors.cyan;
  context.lineWidth = 3;
  context.stroke();
  runBorder(
    context,
    seconds,
    roundedPerimeter(boxWidth, 104, 26),
    () => {
      context.beginPath();
      context.roundRect(boxX, 1376, boxWidth, 104, 26);
    },
    colors.cyan,
  );
  const scheduleSize = fitFont(context, eventConfig.schedule, 800, 52, boxWidth - 70, 28);
  context.font = `800 ${scheduleSize}px ${FONT}`;
  context.fillStyle = colors.cyan;
  context.fillText(eventConfig.schedule, CENTER, 1376 + 52 + scheduleSize * 0.36);
  context.restore();

  // Venue box.
  context.save();
  context.beginPath();
  context.roundRect(boxX, 1504, boxWidth, 176, 26);
  context.fillStyle = 'rgba(7, 9, 13, 0.9)';
  context.fill();
  context.strokeStyle = 'rgba(37, 244, 238, 0.75)';
  context.lineWidth = 2;
  context.stroke();
  runBorder(
    context,
    seconds,
    roundedPerimeter(boxWidth, 176, 26),
    () => {
      context.beginPath();
      context.roundRect(boxX, 1504, boxWidth, 176, 26);
    },
    colors.pink,
    0.5,
  );
  context.fillStyle = colors.white;
  const venueLine = `${eventConfig.venue} - ${eventConfig.address[0].replace(/,$/, '')}`;
  const venueSize = fitFont(context, venueLine, 700, 38, boxWidth - 60, 24);
  context.font = `700 ${venueSize}px ${FONT}`;
  context.fillText(venueLine, CENTER, 1566);
  const addressSize = fitFont(context, eventConfig.address[1], 400, 29, boxWidth - 60, 20);
  context.font = `400 ${addressSize}px ${FONT}`;
  context.fillText(eventConfig.address[1], CENTER, 1624);
  context.restore();

  context.restore();
  context.restore();
}
