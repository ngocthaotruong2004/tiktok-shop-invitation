import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { build } from 'esbuild';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';

const root = path.resolve(import.meta.dirname, '..');
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'invitation-mp4-'));
const destination = path.join(root, 'output/thiep-moi-phat-la-hieu-ung-1080p.mp4');
const width = 1080, height = 1928, fps = 30, count = fps * 8;
function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)));
  });
}
try {
  const font = process.env.INVITATION_FONT ?? '/System/Library/Fonts/Supplemental/Arial Bold.ttf';
  if (!GlobalFonts.registerFromPath(font, 'Be Vietnam Pro')) throw new Error('Cannot load invitation font');
  await build({
    stdin: { contents: `export {drawScene} from './src/scene'; export {eventConfig,getCardVariant} from './src/config';`, resolveDir: root, loader: 'ts' },
    bundle: true, platform: 'node', format: 'esm', outfile: path.join(temporary, 'scene.mjs'),
  });
  globalThis.document = { createElement: () => createCanvas(1, 1) };
  const { drawScene, eventConfig, getCardVariant } = await import(pathToFileURL(path.join(temporary, 'scene.mjs')));
  // Render effects directly over the full-colour original, avoiding GIF's
  // reduced resolution, indexed palette and dithering in the final video.
  eventConfig.backgroundIncludesEffects = false;
  const assets = {
    background: await loadImage(path.join(root, 'public/assets/Group 2147255056.png')),
    guestPhoto: await loadImage(path.join(root, 'public/assets/phatla.png')),
  };
  const source = createCanvas(width, assets.background.height);
  const sourceContext = source.getContext('2d');
  const crop = createCanvas(width, height), context = crop.getContext('2d');
  const variant = getCardVariant('/');
  await fs.mkdir(path.dirname(destination), { recursive: true });
  for (let index = 0; index < count; index += 1) {
    drawScene(sourceContext, assets, 'PHÁT LA', index / fps, variant);
    context.drawImage(source, 0, 0, width, height, 0, 0, width, height);
    const png = crop.toBuffer('image/png');
    await fs.writeFile(path.join(temporary, `${String(index).padStart(4, '0')}.png`), png);
    if (index === fps * 4) await fs.writeFile(destination.replace(/\.mp4$/, '-preview.png'), png);
    if (index % fps === 0) console.log(`Rendered ${index}/${count}`);
  }
  const encoder = path.join(temporary, 'encode-mp4');
  await run('/usr/bin/swiftc', ['-module-cache-path', path.join(temporary, 'swift-cache'), path.join(root, 'scripts/encode-mp4.swift'), '-o', encoder]);
  await run(encoder, [temporary, destination, String(width), String(height), String(fps), String(count)]);
  console.log(JSON.stringify({ destination, width, height, fps, duration: count / fps, bytes: (await fs.stat(destination)).size }));
} finally {
  await fs.rm(temporary, { recursive: true, force: true });
}
