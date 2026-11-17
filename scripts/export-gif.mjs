import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { createCanvas, loadImage, ImageData } from '@napi-rs/canvas';
import gifenc from 'gifenc';
import omggif from 'omggif';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'invitation-gif-'));
try {
  await build({
    stdin: { contents: `export {drawScene} from './src/scene.ts'; export {eventConfig,getCardVariant,getGuestName,makeFilename} from './src/config.ts';`, resolveDir: root, loader: 'ts' },
    bundle: true, platform: 'node', format: 'esm', outfile: path.join(temporary, 'scene.mjs'),
  });
  globalThis.document = { createElement(tag) {
    if (tag !== 'canvas') throw new Error(`Unexpected element: ${tag}`);
    return createCanvas(1, 1);
  } };
  const {drawScene, eventConfig, getCardVariant, getGuestName, makeFilename} = await import(pathToFileURL(path.join(temporary, 'scene.mjs')));
  const readAsset = asset => fs.readFile(path.join(root, 'public', asset));
  const backgroundBytes = await readAsset(eventConfig.assets.background);
  const isGif = backgroundBytes.toString('ascii', 0, 3) === 'GIF';
  const reader = isGif ? new omggif.GifReader(backgroundBytes) : undefined;
  let background;
  let updateBackground = () => {};
  if (reader) {
    background = createCanvas(reader.width, reader.height);
    const ctx = background.getContext('2d');
    const pixels = new Uint8ClampedArray(reader.width * reader.height * 4);
    const delays = Array.from({length: reader.numFrames()}, (_, i) => Math.max(1, reader.frameInfo(i).delay) / 100);
    const duration = delays.reduce((sum, delay) => sum + delay, 0);
    let index = -1, frameEnd = 0;
    updateBackground = seconds => {
      const time = seconds % duration;
      if (index >= 0 && time < frameEnd - delays[index] - 1e-6) {
        pixels.fill(0); index = -1; frameEnd = 0;
      }
      while (index < 0 || (time >= frameEnd - 1e-6 && index < reader.numFrames() - 1)) {
        index += 1;
        if (reader.frameInfo(index).disposal > 1) throw new Error('Unsupported background GIF disposal mode');
        reader.decodeAndBlitFrameRGBA(index, pixels);
        frameEnd += delays[index];
      }
      ctx.putImageData(new ImageData(pixels, reader.width, reader.height), 0, 0);
    };
  } else {
    background = await loadImage(backgroundBytes);
  }
  const assets = {background,
    guestPhoto: eventConfig.assets.guestPhoto ? await loadImage(await readAsset(eventConfig.assets.guestPhoto)) : undefined};
  const requestedName = process.argv.slice(2).find(argument => argument !== '--preview');
  const guestName = getGuestName(requestedName ? `?name=${encodeURIComponent(requestedName)}` : '');
  const variant = getCardVariant('/');
  const width = 720;
  const sourceHeight = Math.round(background.height * 1080 / background.width);
  const height = Math.round(sourceHeight * width / 1080);
  const activeHeight = Math.min(1000, height);
  const fps = 20;
  const count = fps * eventConfig.durationSeconds;
  const source = createCanvas(1080, sourceHeight), sourceContext = source.getContext('2d');
  const output = createCanvas(width, height), context = output.getContext('2d');
  function render(seconds) {
    updateBackground(seconds);
    drawScene(sourceContext, assets, guestName, seconds, variant);
    context.drawImage(source, 0, 0, width, height);
  }
  const outDir = path.join(root, 'output');
  await fs.mkdir(outDir, {recursive: true});
  const stem = makeFilename(guestName, 'gif').replace(/\.gif$/, '');
  render(1);
  await fs.writeFile(path.join(outDir, `${stem}-preview.png`), output.toBuffer('image/png'));
  if (process.argv.includes('--preview')) {
    console.log('Preview saved');
    process.exitCode = 0;
  } else {
    const sample = createCanvas(width / 2, Math.ceil(height / 2) + 3 * activeHeight / 2);
    const sampleContext = sample.getContext('2d');
    render(3);
    sampleContext.drawImage(output, 0, 0, width / 2, height / 2);
    for (let i = 0; i < 3; i += 1) {
      render(i);
      sampleContext.drawImage(output, 0, 0, width, activeHeight, 0, Math.ceil(height / 2) + i * activeHeight / 2, width / 2, activeHeight / 2);
    }
    const {GIFEncoder, quantize, nearestColorIndex} = gifenc;
    const palette = quantize(sampleContext.getImageData(0, 0, sample.width, sample.height).data, 251);
    palette.push([255,255,255], [0,0,0], [0,255,255], [255,0,80]);
    const opaque = palette.slice(), transparentIndex = palette.length;
    palette.push([0,0,0]);
    const lookup = new Int16Array(65536).fill(-1);
    function indexedFrame(rgba, frameHeight) {
      const indexed = new Uint8Array(width * frameHeight);
      let current = new Float32Array((width + 2) * 3), next = new Float32Array(current.length);
      for (let y = 0; y < frameHeight; y += 1) {
        const step = y % 2 === 0 ? 1 : -1;
        for (let x = step === 1 ? 0 : width - 1; x >= 0 && x < width; x += step) {
          const pixel = y * width + x, offset = (x + 1) * 3;
          const rgb = [0,1,2].map(c => Math.max(0, Math.min(255, rgba[pixel * 4 + c] + current[offset + c])));
          const key = ((rgb[0] >> 3) << 11) | ((rgb[1] >> 2) << 5) | (rgb[2] >> 3);
          let match = lookup[key];
          if (match < 0) {
            match = nearestColorIndex(opaque, [(key >> 11) * 8 + 4, ((key >> 5) & 63) * 4 + 2, (key & 31) * 8 + 4]);
            lookup[key] = match;
          }
          indexed[pixel] = match;
          for (let c = 0; c < 3; c += 1) {
            const error = rgb[c] - palette[match][c];
            current[offset + step * 3 + c] += error * 7 / 16;
            next[offset - step * 3 + c] += error * 3 / 16;
            next[offset + c] += error * 5 / 16;
            next[offset + step * 3 + c] += error / 16;
          }
        }
        [current, next] = [next, current]; next.fill(0);
      }
      return indexed;
    }
    const encoder = GIFEncoder();
    let previous;
    for (let frame = 0; frame < count; frame += 1) {
      render(frame / fps);
      const frameHeight = frame === 0 ? height : activeHeight;
      const indexed = indexedFrame(context.getImageData(0, 0, width, frameHeight).data, frameHeight);
      const nextPrevious = indexed.slice(0, width * activeHeight);
      if (previous) for (let i = 0; i < indexed.length; i += 1) if (indexed[i] === previous[i]) indexed[i] = transparentIndex;
      previous = nextPrevious;
      encoder.writeFrame(indexed, width, frameHeight, {
        ...(frame === 0 ? {palette} : {}), delay: 1000 / fps, repeat: 0, dispose: 1,
        ...(frame > 0 ? {transparent: true, transparentIndex} : {}),
      });
      if (frame % 20 === 0) console.log(`Rendered ${frame}/${count}`);
    }
    encoder.finish();
    const destination = path.join(outDir, `${stem}.gif`);
    await fs.writeFile(destination, encoder.bytes());
    console.log(JSON.stringify({destination, width, height, frames: count, duration: eventConfig.durationSeconds, bytes: (await fs.stat(destination)).size}));
  }
} finally {
  await fs.rm(temporary, {recursive: true, force: true});
}
