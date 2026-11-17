import { eventConfig, type CardVariant } from './config';
import type { SceneAssets } from './scene';

const WIDTH = 1080;
const FONT = '"Be Vietnam Pro", sans-serif';

type Word = { text: string; color: string; weight: number };

function toWords(parts: readonly { text: string; tone: 'white' | 'cyan' | 'pink' }[]): Word[] {
  return parts.flatMap((part) =>
    part.text.split(' ').filter(Boolean).map((text) => ({
      text,
      color: eventConfig.colors[part.tone],
      weight: part.tone === 'white' ? 500 : 800,
    })),
  );
}

function measureWord(context: CanvasRenderingContext2D, word: Word, fontSize: number): number {
  context.font = `${word.weight} ${fontSize}px ${FONT}`;
  return context.measureText(word.text).width;
}

// Break words into lines so justified word gaps stay as close to a normal space as possible.
// A short orphan on the last line is penalised.
function wrap(context: CanvasRenderingContext2D, words: Word[], fontSize: number, maxWidth: number): Word[][] {
  const space = fontSize * 0.28;
  const widths = words.map((word) => measureWord(context, word, fontSize));
  const count = words.length;
  const lineWidth = (from: number, to: number): number => {
    let total = 0;
    for (let index = from; index < to; index += 1) total += widths[index] + (index > from ? space : 0);
    return total;
  };

  const cost: number[] = new Array(count + 1).fill(Infinity);
  const next: number[] = new Array(count + 1).fill(count);
  cost[count] = 0;
  for (let from = count - 1; from >= 0; from -= 1) {
    for (let to = from + 1; to <= count; to += 1) {
      const width = lineWidth(from, to);
      if (width > maxWidth && to > from + 1) break;
      const gaps = to - from - 1;
      let lineCost: number;
      if (to === count) {
        lineCost = width < maxWidth * 0.3 ? (maxWidth * 0.3 - width) ** 2 : 0;
      } else if (gaps === 0) {
        lineCost = (maxWidth - width) ** 2;
      } else {
        const extra = (maxWidth - width) / gaps;
        lineCost = extra * extra * gaps * 4;
      }
      if (lineCost + cost[to] < cost[from]) {
        cost[from] = lineCost + cost[to];
        next[from] = to;
      }
    }
  }

  const lines: Word[][] = [];
  for (let from = 0; from < count; from = next[from]) lines.push(words.slice(from, next[from]));
  return lines;
}

const NOTE_SIZE = 34;
const NOTE_LINE = 54;
const NOTE_GAP = 34;
const DISCLAIMER_SIZE = NOTE_SIZE;
const DISCLAIMER_LINE = NOTE_LINE;
const DISCLAIMER_GAP = NOTE_GAP;
const LEFT = 84;
const HEADING_SIZE = 50;
const MIN_HEIGHT = 1920;

type Layout = {
  notes: Word[][][];
  disclaimer: Word[][][];
  disclaimerTitleY: number;
  height: number;
};

function computeLayout(context: CanvasRenderingContext2D, variant: CardVariant): Layout {
  const textX = LEFT + 44;
  const noteWidth = WIDTH - LEFT - textX;
  const notes = eventConfig.notes
    .filter((note) => !note.creatorOnly || variant.showCreatorNote)
    .map((note) => wrap(context, toWords(note.parts), NOTE_SIZE, noteWidth));
  const disclaimer = eventConfig.disclaimer.map((text) =>
    wrap(context, toWords([{ text, tone: 'white' as const }]), DISCLAIMER_SIZE, noteWidth),
  );

  let y = 340;
  for (const lines of notes) y += (lines.length - 1) * NOTE_LINE + NOTE_GAP + NOTE_LINE;
  const disclaimerTitleY = y + 50;
  y = disclaimerTitleY + 64;
  for (const lines of disclaimer) y += (lines.length - 1) * DISCLAIMER_LINE + DISCLAIMER_GAP + DISCLAIMER_LINE;
    const height = Math.max(MIN_HEIGHT, y + 130);
  return { notes, disclaimer, disclaimerTitleY, height };
}

function drawBullet(context: CanvasRenderingContext2D, y: number, fontSize: number, radius: number): void {
  context.fillStyle = eventConfig.colors.pink;
  context.beginPath();
  context.arc(LEFT + 9, y - fontSize * 0.3, radius, 0, Math.PI * 2);
  context.fill();
}

// Lines are justified (even left and right edges); the last line of each item stays natural.
function drawLines(
  context: CanvasRenderingContext2D,
  lines: Word[][],
  y: number,
  fontSize: number,
  lineHeight: number,
): void {
  const textX = LEFT + 44;
  const textWidth = WIDTH - LEFT - textX;
  const space = fontSize * 0.28;
  lines.forEach((line, lineIndex) => {
    const isLast = lineIndex === lines.length - 1;
    const naturalWidth = line.reduce((sum, word) => sum + measureWord(context, word, fontSize), 0);
    const characters = line.reduce((sum, word) => sum + word.text.length, 0);
    let tracking = 0;
    if (!isLast && line.length > 1) {
      // Share the spare width between word gaps and a little letter spacing so no gap looks too wide.
      const spare = textWidth - naturalWidth - (line.length - 1) * space;
      tracking = Math.max(0, Math.min(spare * 0.55 / Math.max(1, characters), 2.4));
    }
    context.letterSpacing = `${tracking}px`;
    const wordsWidth = line.reduce((sum, word) => sum + measureWord(context, word, fontSize), 0);
    const gap = isLast || line.length < 2 ? space : (textWidth - wordsWidth) / (line.length - 1);
    let x = textX;
    for (const word of line) {
      context.font = `${word.weight} ${fontSize}px ${FONT}`;
      context.fillStyle = word.color;
      context.fillText(word.text, x, y + lineIndex * lineHeight);
      x += measureWord(context, word, fontSize) + gap;
    }
    context.letterSpacing = '0px';
  });
}

function drawHeading(context: CanvasRenderingContext2D, text: string, baseline: number): void {
  context.fillStyle = eventConfig.colors.pink;
  context.beginPath();
  context.arc(LEFT + 36, baseline - HEADING_SIZE * 0.36, 34, 0, Math.PI * 2);
  context.fill();
  context.textAlign = 'center';
  context.fillStyle = eventConfig.colors.white;
  context.font = `900 44px ${FONT}`;
  context.fillText('!', LEFT + 36, baseline - HEADING_SIZE * 0.36 + 15);
  context.textAlign = 'left';
  context.font = `800 ${HEADING_SIZE}px ${FONT}`;
  context.fillText(text, LEFT + 92, baseline);
}

// The notes canvas grows with its content so the whole text always fits.
export function drawNotes(context: CanvasRenderingContext2D, _assets: SceneAssets, variant: CardVariant): void {
  const canvas = context.canvas;
  const layout = computeLayout(context, variant);
  if (canvas.height !== layout.height) canvas.height = layout.height;
  const height = layout.height;

  context.save();
  context.clearRect(0, 0, WIDTH, height);
  context.fillStyle = '#000000';
  context.fillRect(0, 0, WIDTH, height);

  drawHeading(context, `${eventConfig.notesTitle}:`, 226);

  context.textAlign = 'left';
  let y = 340;
  for (const lines of layout.notes) {
    drawBullet(context, y, NOTE_SIZE, 7);
    drawLines(context, lines, y, NOTE_SIZE, NOTE_LINE);
    y += (lines.length - 1) * NOTE_LINE + NOTE_GAP + NOTE_LINE;
  }

  drawHeading(context, `${eventConfig.disclaimerTitle}:`, layout.disclaimerTitleY);

  y = layout.disclaimerTitleY + 64;
  for (const lines of layout.disclaimer) {
    drawBullet(context, y, DISCLAIMER_SIZE, 7);
    drawLines(context, lines, y, DISCLAIMER_SIZE, DISCLAIMER_LINE);
    y += (lines.length - 1) * DISCLAIMER_LINE + DISCLAIMER_GAP + DISCLAIMER_LINE;
  }

  context.restore();
}
